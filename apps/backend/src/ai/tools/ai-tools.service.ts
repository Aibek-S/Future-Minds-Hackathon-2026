import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from '../embeddings.service';
import { Prisma, RecommendationType } from '@prisma/client';

const COMPLETED_MASTERY = 0.8;
const PREREQUISITE_MASTERY = 0.4;
const MATERIAL_SIMILARITY_THRESHOLD = 0.35;

export interface ToolExecutionContext {
  studentId?: string;
  classId?: string;
  userId?: string;
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService, private readonly embeddings: EmbeddingsService) {}

  /** Executes a named tool. Returns a string-safe payload for the LLM. */
  async execute(name: string, args: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    switch (name) {
      case 'search_materials':
        return this.stringify(await this.searchMaterials(args));
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
      case 'create_lesson_recommendation':
        return this.stringify(
          context.classId ? await this.createLessonRecommendation(context.classId) : { error: 'No class context' },
        );
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  }

  async searchMaterials(args: { query?: unknown; topicId?: unknown }) {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    const topicId = typeof args.topicId === 'string' ? args.topicId : undefined;
    if (!query) return { error: 'query must be a non-empty string' };
    const vector = `[${(await this.embeddings.embed(query)).join(',')}]`;
    const filter = topicId ? Prisma.sql`WHERE "topicId" = ${topicId}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ id: string; topicId: string; content: string; metadata: unknown; similarity: number }>>`
      SELECT id, "topicId", content, metadata, 1 - (embedding <=> ${vector}::vector) AS similarity
      FROM "MaterialVector" ${filter} ORDER BY embedding <=> ${vector}::vector LIMIT 5`;
    const materials = rows
      .map((row) => ({ ...row, similarity: Number(row.similarity) }))
      .filter((row) => row.similarity >= MATERIAL_SIMILARITY_THRESHOLD);
    return {
      materials,
      fallbackToGeneralKnowledge: materials.length === 0,
      similarityThreshold: MATERIAL_SIMILARITY_THRESHOLD,
    };
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

  /**
   * Creates a real, pending AiRecommendation row for the class's currently
   * weakest topic (same "lowest observed mastery" heuristic as the
   * non-chat /orchestrator/query flow) and returns its id. The orchestrator
   * chat embeds this id in the CONFIRM widget it shows the teacher, so the
   * widget's Approve/Reject buttons can call the existing, already-tested
   * /recommendations/:id/approve and /reject endpoints directly.
   */
  private async createLessonRecommendation(classId: string) {
    const classroom = await this.prisma.class.findUnique({ where: { id: classId }, select: { teacherId: true } });
    if (!classroom) {
      return { error: 'Class not found' };
    }

    const knowledge = await this.prisma.studentKnowledge.findMany({
      where: { student: { classId } },
      include: { topic: { select: { id: true, name: true } } },
    });

    let topic: { id: string; name: string; mastery: number };
    if (knowledge.length) {
      const grouped = new Map<string, { id: string; name: string; values: number[] }>();
      for (const item of knowledge) {
        const current = grouped.get(item.topicId) ?? { id: item.topic.id, name: item.topic.name, values: [] };
        current.values.push(item.mastery);
        grouped.set(item.topicId, current);
      }
      topic = [...grouped.values()]
        .map((item) => ({ id: item.id, name: item.name, mastery: item.values.reduce((s, v) => s + v, 0) / item.values.length }))
        .sort((a, b) => a.mastery - b.mastery)[0];
    } else {
      const fallback = await this.prisma.topic.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });
      if (!fallback) {
        return { error: 'No topics available for this class' };
      }
      topic = { ...fallback, mastery: 0 };
    }

    const date = new Date();
    date.setDate(date.getDate() + 1);
    const planJson = {
      objectives: [`Разобраться в ключевых идеях темы «${topic.name}»`],
      warmup: `Быстрое повторение базы перед темой «${topic.name}»`,
      explanation: `Объяснение и разбор примеров по теме «${topic.name}»`,
      practice: [`Самостоятельное решение задач по теме «${topic.name}»`],
      differentiatedTasks: {
        weak: ['Разбор с подсказками и облегчённая практика'],
        strong: ['Усложнённая прикладная задача'],
      },
      assessment: 'Итоговая проверка с одной ключевой задачей',
      homework: `Дополнительная практика по теме «${topic.name}»`,
    };

    const recommendation = await this.prisma.aiRecommendation.create({
      data: {
        teacherId: classroom.teacherId,
        classId,
        type: RecommendationType.LESSON_PLAN,
        payload: { topicId: topic.id, date: date.toISOString(), planJson } as Prisma.InputJsonValue,
        reasoning: `Наименьший наблюдаемый mastery класса: ${Math.round(topic.mastery * 100)}% по теме «${topic.name}».`,
      },
    });

    return {
      recommendationId: recommendation.id,
      topicName: topic.name,
      masteryPercent: Math.round(topic.mastery * 100),
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
    if (typeof args.grade === 'number' && Number.isInteger(args.grade) && args.grade >= 7 && args.grade <= 12) {
      data.grade = args.grade;
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
