import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DiagnosticDto, UpdateStudentDto } from './dto/student.dto';

const COMPLETED_MASTERY = 0.8;
const PREREQUISITE_MASTERY = 0.4;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string, requester: { id: string; role: string }) {
    await this.assertAccess(id, requester);
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        grade: true,
        classId: true,
        goals: true,
        preferences: true,
        createdAt: true,
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  async updateProfile(id: string, dto: UpdateStudentDto, requester: { id: string; role: string }) {
    await this.assertAccess(id, requester);
    try {
      return await this.prisma.student.update({
        where: { id },
        data: {
          ...(dto.grade === undefined ? {} : { grade: dto.grade }),
          ...(dto.goals === undefined ? {} : { goals: dto.goals as unknown as Prisma.InputJsonValue }),
          ...(dto.preferences === undefined
            ? {}
            : { preferences: dto.preferences as Prisma.InputJsonValue }),
        },
        select: {
          id: true,
          userId: true,
          grade: true,
          classId: true,
          goals: true,
          preferences: true,
          createdAt: true,
        },
      });
    } catch {
      throw new NotFoundException('Student not found');
    }
  }

  async getKnowledge(id: string, requester: { id: string; role: string }, subjectId?: string) {
    await this.assertAccess(id, requester);
    if (subjectId) {
      await this.ensureSubject(subjectId);
    }
    const topics = await this.prisma.topic.findMany({
      where: subjectId ? { subjectId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: {
        knowledge: { where: { studentId: id } },
        tasks: {
          include: {
            attempts: {
              where: { studentId: id },
              orderBy: { createdAt: 'desc' },
              take: 3,
              select: { correct: true, createdAt: true },
            },
          },
        },
      },
    });

    return {
      topics: topics.map((topic) => {
        const knowledge = topic.knowledge[0];
        const recent = topic.tasks
          .flatMap((task) => task.attempts)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(0, 3);
        const correctAttempts = knowledge?.correctAttempts ?? 0;
        const trend = this.getTrend(recent);
        return {
          topicId: topic.id,
          topicName: topic.name,
          mastery: knowledge?.mastery ?? 0,
          attempts: knowledge?.attempts ?? 0,
          correctAttempts,
          trend,
          prerequisiteMet: this.arePrerequisitesMet(topic.prerequisites, topics),
          lastActivity: knowledge?.lastActivity ?? null,
        };
      }),
    };
  }

  async getSubjectSummary(id: string, requester: { id: string; role: string }) {
    await this.assertAccess(id, requester);
    const subjects = await this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        topics: {
          include: {
            knowledge: { where: { studentId: id } },
          },
        },
      },
    });

    return {
      subjects: subjects.map((subject) => {
        const topicCount = subject.topics.length;
        const completed = subject.topics.filter(
          (topic) => (topic.knowledge[0]?.mastery ?? 0) >= COMPLETED_MASTERY,
        ).length;
        const avgMastery =
          topicCount > 0
            ? subject.topics.reduce(
                (sum, topic) => sum + (topic.knowledge[0]?.mastery ?? 0),
                0,
              ) / topicCount
            : 0;
        return {
          id: subject.id,
          name: subject.name,
          avgMastery: Number(avgMastery.toFixed(3)),
          topicCount,
          topicsCompleted: completed,
        };
      }),
    };
  }

  async runDiagnostic(id: string, dto: DiagnosticDto, requester: { id: string; role: string }) {
    await this.assertAccess(id, requester);
    const topicIds = dto.answers.map((answer) => answer.topicId);
    const topics = await this.prisma.topic.findMany({ where: { id: { in: topicIds } } });
    const topicMap = new Map(topics.map((topic) => [topic.id, topic]));

    for (const answer of dto.answers) {
      if (!topicMap.has(answer.topicId)) {
        throw new NotFoundException(`Topic ${answer.topicId} not found`);
      }
      const result = answer.correct ? 1 : 0;
      await this.prisma.studentKnowledge.upsert({
        where: { studentId_topicId: { studentId: id, topicId: answer.topicId } },
        update: {
          mastery: { set: 0.7 * (await this.getMastery(id, answer.topicId)) + 0.3 * result },
          attempts: { increment: 1 },
          correctAttempts: { increment: answer.correct ? 1 : 0 },
        },
        create: {
          studentId: id,
          topicId: answer.topicId,
          mastery: 0.3 * result,
          attempts: 1,
          correctAttempts: answer.correct ? 1 : 0,
        },
      });
    }

    const knowledge = await this.getKnowledge(id, requester);
    const recommended = knowledge.topics.find((topic) => topic.mastery < COMPLETED_MASTERY && topic.prerequisiteMet);
    const student = await this.prisma.student.findUnique({ where: { id }, select: { goals: true } });
    return {
      knowledgeState: knowledge.topics.map(({ topicId, topicName, mastery, prerequisiteMet }) => ({
        topicId,
        topicName,
        mastery,
        prerequisiteMet,
      })),
      detectedGoals: student?.goals ?? [],
      recommendedStartTopic: recommended?.topicId ?? null,
    };
  }

  async getRoadmap(id: string, requester: { id: string; role: string }, subjectId?: string) {
    await this.assertAccess(id, requester);
    const knowledge = await this.getKnowledge(id, requester, subjectId);
    const completed = knowledge.topics.filter((topic) => topic.mastery >= COMPLETED_MASTERY).map((topic) => topic.topicName);
    const available = knowledge.topics.filter((topic) => topic.prerequisiteMet && topic.mastery < COMPLETED_MASTERY);
    const current = available[0] ?? null;
    const student = await this.prisma.student.findUnique({ where: { id }, select: { goals: true } });

    return {
      completed,
      current: current
        ? {
            topicId: current.topicId,
            topicName: current.topicName,
            reason: `mastery ${Math.round(current.mastery * 100)}%`,
          }
        : null,
      next: knowledge.topics
        .filter((topic) => topic.topicId !== current?.topicId)
        .slice(0, 3)
        .map((topic) => ({
          topicId: topic.topicId,
          topicName: topic.topicName,
          prerequisiteMet: topic.prerequisiteMet,
        })),
      goals: this.getGoalsWithProgress(student?.goals, completed.length, knowledge.topics.length),
    };
  }

  private async assertAccess(id: string, requester: { id: string; role: string }) {
    if (requester.role === 'TEACHER' || requester.role === 'ADMIN') {
      return;
    }
    const student = await this.prisma.student.findUnique({ where: { id }, select: { userId: true } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.userId !== requester.id) {
      throw new ForbiddenException('You can access only your own student profile');
    }
  }

  private async getMastery(studentId: string, topicId: string) {
    const knowledge = await this.prisma.studentKnowledge.findUnique({
      where: { studentId_topicId: { studentId, topicId } },
      select: { mastery: true },
    });
    return knowledge?.mastery ?? 0;
  }

  private async ensureSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id }, select: { id: true } });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
  }

  private arePrerequisitesMet(prerequisites: string[], topics: { id: string; knowledge: { mastery: number }[] }[]) {
    return prerequisites.every((prerequisiteId) => {
      const prerequisite = topics.find((topic) => topic.id === prerequisiteId);
      return (prerequisite?.knowledge[0]?.mastery ?? 0) > PREREQUISITE_MASTERY;
    });
  }

  private getTrend(attempts: { correct: boolean }[]) {
    if (attempts.length < 2) {
      return 'stable';
    }
    const score = attempts.filter((attempt) => attempt.correct).length / attempts.length;
    return score >= 0.67 ? 'improving' : score <= 0.33 ? 'declining' : 'stable';
  }

  private getGoalsWithProgress(goals: Prisma.JsonValue | null | undefined, completed: number, total: number) {
    if (!Array.isArray(goals)) {
      return [];
    }
    return goals.map((goal) => ({
      ...(typeof goal === 'object' && goal !== null ? goal : {}),
      progress: total ? Number((completed / total).toFixed(2)) : 0,
    }));
  }
}
