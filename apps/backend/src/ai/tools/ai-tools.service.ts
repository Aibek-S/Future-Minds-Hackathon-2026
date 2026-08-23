import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const COMPLETED_MASTERY = 0.8;
const PREREQUISITE_MASTERY = 0.4;

export interface ToolExecutionContext {
  studentId: string;
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Executes a named tool. Returns a string-safe payload for the LLM. */
  async execute(name: string, args: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    switch (name) {
      case 'get_knowledge_state':
        return this.stringify(await this.getKnowledgeState(context.studentId, args.subjectId as string | undefined));
      case 'get_subject_summary':
        return this.stringify(await this.getSubjectSummary(context.studentId));
      case 'get_roadmap':
        return this.stringify(await this.getRoadmap(context.studentId, args.subjectId as string | undefined));
      case 'update_student_profile':
        return this.stringify(await this.updateStudentProfile(context.studentId, args));
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  }

  private async getKnowledgeState(studentId: string, subjectId?: string) {
    if (subjectId) {
      await this.ensureSubject(subjectId);
    }
    const topics = await this.prisma.topic.findMany({
      where: subjectId ? { subjectId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: { knowledge: { where: { studentId } } },
    });
    return {
      topics: topics.map((topic) => {
        const knowledge = topic.knowledge[0];
        return {
          topicId: topic.id,
          topicName: topic.name,
          mastery: knowledge?.mastery ?? 0,
          attempts: knowledge?.attempts ?? 0,
          correctAttempts: knowledge?.correctAttempts ?? 0,
          prerequisiteMet: this.arePrerequisitesMet(topic.prerequisites, topics),
        };
      }),
    };
  }

  private async getSubjectSummary(studentId: string) {
    const subjects = await this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: { topics: { include: { knowledge: { where: { studentId } } } } },
    });
    return {
      subjects: subjects.map((subject) => {
        const values = subject.topics.map((topic) => topic.knowledge[0]?.mastery ?? 0);
        return {
          id: subject.id,
          name: subject.name,
          avgMastery: values.length ? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(3)) : 0,
          topicCount: values.length,
          topicsCompleted: values.filter((v) => v >= COMPLETED_MASTERY).length,
        };
      }),
    };
  }

  private async getRoadmap(studentId: string, subjectId?: string) {
    const topics = await this.prisma.topic.findMany({
      where: subjectId ? { subjectId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: { knowledge: { where: { studentId } } },
    });
    const masteryByTopic = new Map(topics.map((topic) => [topic.id, topic.knowledge[0]?.mastery ?? 0]));
    const completed = topics.filter((topic) => masteryByTopic.get(topic.id)! >= COMPLETED_MASTERY).map((t) => t.name);
    const available = topics.filter(
      (topic) =>
        masteryByTopic.get(topic.id)! < COMPLETED_MASTERY &&
        this.arePrerequisitesMet(topic.prerequisites, topics),
    );
    const current = available[0] ?? null;
    return {
      completed,
      current: current
        ? { topicId: current.id, topicName: current.name, reason: `mastery ${Math.round(masteryByTopic.get(current.id)! * 100)}%` }
        : null,
      next: topics
        .filter((topic) => topic.id !== current?.id)
        .filter((topic) => masteryByTopic.get(topic.id)! < COMPLETED_MASTERY)
        .slice(0, 3)
        .map((topic) => ({ topicId: topic.id, topicName: topic.name })),
    };
  }

  private async updateStudentProfile(studentId: string, args: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    if (args.goals !== undefined) {
      data.goals = args.goals;
    }
    if (args.preferences !== undefined) {
      data.preferences = args.preferences;
    }
    if (Object.keys(data).length === 0) {
      return { error: 'Nothing to update' };
    }
    return this.prisma.student.update({
      where: { id: studentId },
      data: data as never,
      select: { id: true, grade: true, goals: true, preferences: true },
    });
  }

  private async ensureSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id }, select: { id: true } });
    if (!subject) {
      throw new Error(`Subject not found: ${id}`);
    }
  }

  private arePrerequisitesMet(prerequisites: string[], topics: { id: string; knowledge: { mastery: number }[] }[]) {
    return prerequisites.every((prerequisiteId) => {
      const prerequisite = topics.find((topic) => topic.id === prerequisiteId);
      return (prerequisite?.knowledge[0]?.mastery ?? 0) > PREREQUISITE_MASTERY;
    });
  }

  private stringify(value: unknown): string {
    return JSON.stringify(value);
  }
}
