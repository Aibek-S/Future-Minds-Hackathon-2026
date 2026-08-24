import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const COMPLETED_MASTERY = 0.8;
const PREREQUISITE_MASTERY = 0.4;

export interface ToolExecutionContext {
  studentId?: string;
  classId?: string;
  userId?: string;
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Executes a named tool. Returns a string-safe payload for the LLM. */
  async execute(name: string, args: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    switch (name) {
      case 'get_knowledge_state':
        return this.stringify(
          context.studentId
            ? await this.getKnowledgeState(context.studentId, args.subjectId as string | undefined)
            : { error: 'No student context' },
        );
      case 'get_subject_summary':
        return this.stringify(
          context.studentId ? await this.getSubjectSummary(context.studentId) : { error: 'No student context' },
        );
      case 'get_roadmap':
        return this.stringify(
          context.studentId
            ? await this.getRoadmap(context.studentId, args.subjectId as string | undefined)
            : { error: 'No student context' },
        );
      case 'update_student_profile':
        return this.stringify(
          context.studentId ? await this.updateStudentProfile(context.studentId, args) : { error: 'No student context' },
        );
      case 'initialize_student_knowledge':
        return this.stringify(
          context.studentId
            ? await this.initializeStudentKnowledge(context.studentId, args)
            : { error: 'No student context' },
        );
      case 'get_class_overview':
        return this.stringify(
          context.classId ? await this.getClassOverview(context.classId) : { error: 'No class context' },
        );
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  }

  private async getClassOverview(classId: string) {
    const students = await this.prisma.student.findMany({
      where: { classId },
      include: {
        user: { select: { name: true } },
        knowledge: { include: { topic: { select: { id: true, name: true } } } },
      },
    });

    const masteryByTopic = new Map<string, { name: string; values: number[] }>();
    for (const student of students) {
      for (const item of student.knowledge) {
        const current = masteryByTopic.get(item.topicId) ?? { name: item.topic.name, values: [] };
        current.values.push(item.mastery);
        masteryByTopic.set(item.topicId, current);
      }
    }

    const studentSummaries = students.map((student) => {
      const values = student.knowledge.map((item) => item.mastery);
      return {
        studentId: student.id,
        name: student.user.name,
        overallMastery: values.length ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(3)) : 0,
      };
    });

    const topics = [...masteryByTopic.entries()].map(([topicId, item]) => ({
      topicId,
      topicName: item.name,
      avgMastery: Number((item.values.reduce((s, v) => s + v, 0) / item.values.length).toFixed(3)),
    }));

    return {
      classId,
      studentCount: students.length,
      classMastery: studentSummaries.length
        ? Number((studentSummaries.reduce((s, v) => s + v.overallMastery, 0) / studentSummaries.length).toFixed(3))
        : 0,
      weakTopics: topics.filter((topic) => topic.avgMastery < 0.4).sort((a, b) => a.avgMastery - b.avgMastery),
      strongTopics: topics.filter((topic) => topic.avgMastery >= 0.7).sort((a, b) => b.avgMastery - a.avgMastery),
      studentsAtRisk: studentSummaries.filter((student) => student.overallMastery < 0.4),
    };
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

  private async initializeStudentKnowledge(studentId: string, args: Record<string, unknown>) {
    const knowledge = args.knowledge;
    if (!Array.isArray(knowledge) || knowledge.length === 0) {
      return { error: 'knowledge must be a non-empty array' };
    }

    const entries = knowledge.map((entry) => entry as { topicId?: unknown; mastery?: unknown });
    if (
      entries.some(
        (entry) =>
          typeof entry.topicId !== 'string' ||
          !entry.topicId ||
          typeof entry.mastery !== 'number' ||
          !Number.isFinite(entry.mastery) ||
          entry.mastery < 0 ||
          entry.mastery > 1,
      )
    ) {
      return { error: 'Each knowledge entry requires topicId and mastery between 0 and 1' };
    }

    const topicIds = [...new Set(entries.map((entry) => entry.topicId as string))];
    if (topicIds.length !== entries.length) {
      return { error: 'Duplicate topicId values are not allowed' };
    }

    const topics = await this.prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true },
    });
    if (topics.length !== topicIds.length) {
      return { error: 'One or more topics do not exist' };
    }

    const result = await this.prisma.studentKnowledge.createMany({
      data: entries.map((entry) => ({
        studentId,
        topicId: entry.topicId as string,
        mastery: entry.mastery as number,
      })),
      skipDuplicates: true,
    });
    return { created: result.count, skipped: entries.length - result.count };
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
