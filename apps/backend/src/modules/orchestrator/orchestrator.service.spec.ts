import { BadRequestException } from '@nestjs/common';
import { RecommendationStatus, RecommendationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { OrchestratorService } from './orchestrator.service';

describe('OrchestratorService', () => {
  let prisma: {
    teacher: { findUnique: jest.Mock };
    class: { findUnique: jest.Mock };
    studentKnowledge: { findMany: jest.Mock };
    topic: { findFirst: jest.Mock; findUnique: jest.Mock };
    aiRecommendation: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: OrchestratorService;
  const teacher = { id: 'teacher-user', role: 'TEACHER' };
  const payload = {
    topicId: 'topic-1', date: '2026-09-10T09:00:00.000Z',
    planJson: {
      objectives: ['Understand Functions'], warmup: 'Review', explanation: 'Explain', practice: ['Task'],
      differentiatedTasks: { weak: ['Hint'], strong: ['Extension'] }, assessment: 'Exit ticket', homework: 'Practice',
    },
  };

  beforeEach(() => {
    prisma = {
      teacher: { findUnique: jest.fn().mockResolvedValue({ userId: teacher.id }) },
      class: { findUnique: jest.fn().mockResolvedValue({ teacherId: 'teacher-1' }) },
      studentKnowledge: { findMany: jest.fn().mockResolvedValue([
        { topicId: 'topic-1', mastery: 0.3, topic: { id: 'topic-1', name: 'Functions' } },
      ]) },
      topic: { findFirst: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: 'topic-1' }) },
      aiRecommendation: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new OrchestratorService(
      prisma as unknown as PrismaService,
      { generate: jest.fn().mockResolvedValue({ text: 'AI lesson recommendation' }) } as unknown as AiService,
      { emitNewRecommendation: jest.fn() } as never,
    );
  });

  it('creates a lesson-plan recommendation from the weakest class topic', async () => {
    prisma.aiRecommendation.create.mockResolvedValue({ id: 'rec-1' });

    const result = await service.query({ teacherId: 'teacher-1', classId: 'class-1', question: 'What next?' }, teacher);

    expect(result.suggestedRecommendationId).toBe('rec-1');
    expect(prisma.aiRecommendation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: RecommendationType.LESSON_PLAN, classId: 'class-1', teacherId: 'teacher-1' }),
    }));
  });

  it('lists recommendations with the contract response shape', async () => {
    prisma.aiRecommendation.findMany.mockResolvedValue([
      { id: 'rec-1', type: RecommendationType.LESSON_PLAN, payload, reasoning: 'Low mastery', status: RecommendationStatus.PENDING, createdAt: new Date() },
    ]);

    const result = await service.list('class-1', 'pending', teacher);

    expect(result.recommendations[0]).toMatchObject({ id: 'rec-1', status: 'pending', recommendation: payload });
  });

  it('approves a lesson plan by creating a lesson atomically', async () => {
    prisma.aiRecommendation.findUnique.mockResolvedValue({
      id: 'rec-1', teacherId: 'teacher-1', classId: 'class-1', type: RecommendationType.LESSON_PLAN,
      payload, status: RecommendationStatus.PENDING,
    });
    const transaction = {
      lesson: { create: jest.fn().mockResolvedValue({ id: 'lesson-1' }) },
      aiRecommendation: { update: jest.fn().mockResolvedValue({ id: 'rec-1' }) },
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(transaction));

    await expect(service.approve('rec-1', {}, teacher)).resolves.toEqual({ id: 'rec-1', status: 'approved', lessonId: 'lesson-1' });
    expect(transaction.lesson.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ classId: 'class-1', topicId: 'topic-1' }),
    }));
  });

  it('rejects an approval with an invalid edited plan', async () => {
    prisma.aiRecommendation.findUnique.mockResolvedValue({
      id: 'rec-1', teacherId: 'teacher-1', classId: 'class-1', type: RecommendationType.LESSON_PLAN,
      payload, status: RecommendationStatus.PENDING,
    });

    await expect(service.approve('rec-1', { edits: { planJson: { objectives: [] } } }, teacher))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a pending recommendation without creating a lesson', async () => {
    prisma.aiRecommendation.findUnique.mockResolvedValue({
      id: 'rec-1', teacherId: 'teacher-1', classId: 'class-1', type: RecommendationType.LESSON_PLAN,
      payload, status: RecommendationStatus.PENDING,
    });
    prisma.aiRecommendation.update.mockResolvedValue({ id: 'rec-1', status: RecommendationStatus.REJECTED });

    await expect(service.reject('rec-1', teacher)).resolves.toEqual({ id: 'rec-1', status: 'rejected' });
  });
});
