import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RecommendationStatus, RecommendationType, Prisma, SessionKind } from '@prisma/client';
import { AiService } from '../../ai/ai.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { LessonPlanValidator } from '../lessons/dto/lesson-plan.validator';
import { ApproveRecommendationDto, OrchestratorQueryDto } from './dto/orchestrator.dto';

type Requester = { id: string; role: string };
type LessonPlanPayload = { topicId: string; date: string; planJson: Record<string, unknown> };

@Injectable()
export class OrchestratorService {
  private readonly lessonPlanValidator = new LessonPlanValidator();

  constructor(private readonly prisma: PrismaService, private readonly ai: AiService, private readonly realtime: RealtimeGateway) {}

  async query(dto: OrchestratorQueryDto, requester: Requester) {
    await this.assertTeacherAccess(dto.teacherId, requester);
    const classroom = await this.prisma.class.findUnique({ where: { id: dto.classId }, select: { teacherId: true } });
    if (!classroom || classroom.teacherId !== dto.teacherId) {
      throw new NotFoundException('Class not found for this teacher');
    }

    const topic = await this.findPriorityTopic(dto.classId);
    const aiResult = await this.ai.generate({
      task: SessionKind.ORCHESTRATOR,
      classId: dto.classId,
      messages: [{
        role: 'user',
        content: `Teacher question: ${dto.question}\nPriority topic: ${topic.name}; class mastery: ${Math.round(topic.mastery * 100)}%. Give a concise, actionable lesson recommendation.`,
      }],
    });
    const payload = this.createLessonPlanPayload(topic.id, topic.name);
    const recommendation = await this.prisma.aiRecommendation.create({
      data: {
        teacherId: dto.teacherId,
        classId: dto.classId,
        type: RecommendationType.LESSON_PLAN,
        payload: payload as Prisma.InputJsonValue,
        reasoning: `Lowest observed class mastery is ${Math.round(topic.mastery * 100)}% for ${topic.name}.`,
      },
    });
    this.realtime.emitNewRecommendation({ classId: dto.classId, recommendationId: recommendation.id, type: recommendation.type });

    return {
      answer: aiResult.text,
      reasoning: [
        `${Math.round(topic.mastery * 100)}% class mastery for ${topic.name}`,
        'The proposed plan includes support and extension tasks.',
      ],
      suggestedRecommendationId: recommendation.id,
    };
  }

  async list(classId: string, status: string | undefined, requester: Requester) {
    const classroom = await this.prisma.class.findUnique({ where: { id: classId }, select: { teacherId: true } });
    if (!classroom) {
      throw new NotFoundException('Class not found');
    }
    await this.assertTeacherAccess(classroom.teacherId, requester);
    const normalizedStatus = this.parseStatus(status);
    const recommendations = await this.prisma.aiRecommendation.findMany({
      where: { classId, ...(normalizedStatus ? { status: normalizedStatus } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return {
      recommendations: recommendations.map((recommendation) => ({
        id: recommendation.id,
        type: recommendation.type,
        recommendation: recommendation.payload,
        reasoning: recommendation.reasoning,
        status: recommendation.status.toLowerCase(),
        createdAt: recommendation.createdAt,
      })),
    };
  }

  async approve(recommendationId: string, dto: ApproveRecommendationDto, requester: Requester) {
    const recommendation = await this.findOwnedRecommendation(recommendationId, requester);
    if (recommendation.status !== RecommendationStatus.PENDING) {
      throw new BadRequestException('Only pending recommendations can be approved');
    }
    if (recommendation.type !== RecommendationType.LESSON_PLAN) {
      const updated = await this.prisma.aiRecommendation.update({
        where: { id: recommendation.id }, data: { status: RecommendationStatus.APPROVED },
      });
      return { id: updated.id, status: updated.status.toLowerCase() };
    }

    const payload = this.applyEdits(recommendation.payload, dto.edits);
    if (!this.isLessonPlanPayload(payload) || !this.lessonPlanValidator.validate(payload.planJson)) {
      throw new BadRequestException('LESSON_PLAN payload does not contain a valid lesson plan');
    }
    const date = new Date(payload.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Lesson plan date must be a valid ISO date');
    }
    const topic = await this.prisma.topic.findUnique({ where: { id: payload.topicId }, select: { id: true } });
    if (!topic) {
      throw new BadRequestException('Lesson plan topic no longer exists');
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const lesson = await transaction.lesson.create({
        data: {
          classId: recommendation.classId,
          teacherId: recommendation.teacherId,
          topicId: payload.topicId,
          date,
          planJson: payload.planJson as Prisma.InputJsonValue,
        },
      });
      const updated = await transaction.aiRecommendation.update({
        where: { id: recommendation.id },
        data: { status: RecommendationStatus.APPROVED, payload: payload as Prisma.InputJsonValue },
      });
      return { lesson, recommendation: updated };
    });

    return { id: result.recommendation.id, status: 'approved', lessonId: result.lesson.id };
  }

  async reject(recommendationId: string, requester: Requester) {
    const recommendation = await this.findOwnedRecommendation(recommendationId, requester);
    if (recommendation.status !== RecommendationStatus.PENDING) {
      throw new BadRequestException('Only pending recommendations can be rejected');
    }
    const updated = await this.prisma.aiRecommendation.update({
      where: { id: recommendation.id }, data: { status: RecommendationStatus.REJECTED },
    });
    return { id: updated.id, status: updated.status.toLowerCase() };
  }

  private async findPriorityTopic(classId: string) {
    const knowledge = await this.prisma.studentKnowledge.findMany({
      where: { student: { classId } },
      include: { topic: { select: { id: true, name: true } } },
    });
    if (knowledge.length) {
      const grouped = new Map<string, { id: string; name: string; values: number[] }>();
      for (const item of knowledge) {
        const current = grouped.get(item.topicId) ?? { id: item.topic.id, name: item.topic.name, values: [] };
        current.values.push(item.mastery);
        grouped.set(item.topicId, current);
      }
      return [...grouped.values()]
        .map((item) => ({ id: item.id, name: item.name, mastery: item.values.reduce((sum, value) => sum + value, 0) / item.values.length }))
        .sort((left, right) => left.mastery - right.mastery)[0];
    }
    const fallback = await this.prisma.topic.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });
    if (!fallback) {
      throw new NotFoundException('No topics are available for lesson planning');
    }
    return { ...fallback, mastery: 0 };
  }

  private createLessonPlanPayload(topicId: string, topicName: string): LessonPlanPayload {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return {
      topicId,
      date: date.toISOString(),
      planJson: {
        objectives: [`Understand the core ideas of ${topicName}`],
        warmup: `Quick review of prerequisite knowledge for ${topicName}`,
        explanation: `Teacher explanation and guided examples for ${topicName}`,
        practice: [`Solve core ${topicName} tasks independently`],
        differentiatedTasks: {
          weak: ['Use a worked example and scaffolded practice'],
          strong: ['Solve an extended application problem'],
        },
        assessment: 'Exit ticket with one key problem',
        homework: `Complete additional ${topicName} practice`,
      },
    };
  }

  private async findOwnedRecommendation(recommendationId: string, requester: Requester) {
    const recommendation = await this.prisma.aiRecommendation.findUnique({ where: { id: recommendationId } });
    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }
    await this.assertTeacherAccess(recommendation.teacherId, requester);
    return recommendation;
  }

  private async assertTeacherAccess(teacherId: string, requester: Requester) {
    if (requester.role === 'ADMIN') {
      return;
    }
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
    if (!teacher || requester.role !== 'TEACHER' || teacher.userId !== requester.id) {
      throw new ForbiddenException('You can manage only your own recommendations');
    }
  }

  private parseStatus(status: string | undefined) {
    if (!status) {
      return undefined;
    }
    const upper = status.toUpperCase();
    if (!Object.values(RecommendationStatus).includes(upper as RecommendationStatus)) {
      throw new BadRequestException('Unknown recommendation status');
    }
    return upper as RecommendationStatus;
  }

  private applyEdits(payload: Prisma.JsonValue, edits: Record<string, unknown> | undefined) {
    if (!this.isRecord(payload)) {
      throw new BadRequestException('Recommendation payload is invalid');
    }
    return { ...payload, ...(edits ?? {}) };
  }

  private isLessonPlanPayload(value: unknown): value is LessonPlanPayload {
    return this.isRecord(value)
      && typeof value.topicId === 'string'
      && typeof value.date === 'string'
      && this.isRecord(value.planJson);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
