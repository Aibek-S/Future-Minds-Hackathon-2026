import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LessonsService } from './lessons.service';

describe('LessonsService', () => {
  let prisma: {
    class: { findUnique: jest.Mock };
    teacher: { findUnique: jest.Mock };
    topic: { findUnique: jest.Mock };
    lesson: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    student: { findUnique: jest.Mock };
    feedback: { create: jest.Mock; findMany: jest.Mock };
  };
  let service: LessonsService;

  const teacher = { id: 'teacher-user', role: 'TEACHER' };
  const planJson = {
    objectives: ['Solve linear equations'],
    warmup: 'Review',
    explanation: 'Balance method',
    practice: ['2x + 3 = 7'],
    differentiatedTasks: { weak: ['Worked example'], strong: ['Word problem'] },
    assessment: 'Exit ticket',
    homework: 'Exercises 1-5',
  };

  beforeEach(() => {
    prisma = {
      class: { findUnique: jest.fn() },
      teacher: { findUnique: jest.fn() },
      topic: { findUnique: jest.fn() },
      lesson: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      student: { findUnique: jest.fn() },
      feedback: { create: jest.fn(), findMany: jest.fn() },
    };
    service = new LessonsService(prisma as unknown as PrismaService);
    prisma.teacher.findUnique.mockResolvedValue({ userId: teacher.id });
  });

  it('creates a lesson owned by the class teacher and linked to its topic', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.topic.findUnique.mockResolvedValue({ id: 'topic-1' });
    prisma.lesson.create.mockImplementation(async ({ data }) => ({ id: 'lesson-1', ...data }));

    const result = await service.create('class-1', {
      date: '2026-09-01T09:00:00.000Z', topicId: 'topic-1', planJson,
    }, teacher);

    expect(result).toMatchObject({ id: 'lesson-1', classId: 'class-1', teacherId: 'teacher-1', topicId: 'topic-1' });
    expect(prisma.lesson.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ planJson }),
    }));
  });

  it('prevents a teacher from creating a lesson in another teacher’s class', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.teacher.findUnique.mockResolvedValue({ userId: 'another-user' });

    await expect(service.create('class-1', {
      date: '2026-09-01T09:00:00.000Z', topicId: 'topic-1', planJson,
    }, teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('filters the class calendar by the requested date range', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.lesson.findMany.mockResolvedValue([]);

    await service.listForClass('class-1', '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.999Z', teacher);

    expect(prisma.lesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ classId: 'class-1', date: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }) }),
    }));
  });

  it('updates only a lesson owned by the requesting teacher', async () => {
    prisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', class: { teacherId: 'teacher-1' } });
    prisma.topic.findUnique.mockResolvedValue({ id: 'topic-2' });
    prisma.lesson.update.mockResolvedValue({ id: 'lesson-1', topicId: 'topic-2' });

    await expect(service.update('lesson-1', { topicId: 'topic-2' }, teacher)).resolves.toMatchObject({ topicId: 'topic-2' });
    expect(prisma.lesson.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'lesson-1' } }));
  });

  it('allows feedback only after the lesson and from an enrolled student', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1', classId: 'class-1' });
    prisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', date: new Date('2020-01-01T00:00:00.000Z'), classId: 'class-1' });
    prisma.feedback.create.mockResolvedValue({ id: 'feedback-1', rating: 5 });

    await expect(service.createFeedback('lesson-1', { rating: 5, commentOrAudioUrl: 'Helpful' }, {
      id: 'student-user', role: 'STUDENT',
    })).resolves.toMatchObject({ id: 'feedback-1', rating: 5 });
  });

  it('rejects feedback before the lesson date', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1', classId: 'class-1' });
    prisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', date: new Date('2999-01-01T00:00:00.000Z'), classId: 'class-1' });

    await expect(service.createFeedback('lesson-1', { rating: 5 }, { id: 'student-user', role: 'STUDENT' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a not-found error for an unknown lesson', async () => {
    prisma.lesson.findUnique.mockResolvedValue(null);

    await expect(service.getById('missing-lesson', teacher)).rejects.toBeInstanceOf(NotFoundException);
  });
});
