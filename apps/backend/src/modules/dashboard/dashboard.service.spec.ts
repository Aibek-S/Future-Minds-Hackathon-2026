import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let prisma: {
    class: { findUnique: jest.Mock };
    teacher: { findUnique: jest.Mock };
    student: { findMany: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock };
    attempt: { findMany: jest.Mock };
  };
  let service: DashboardService;

  const teacher = { id: 'teacher-user', role: 'TEACHER' };
  const students = [
    {
      id: 'student-1', user: { name: 'Aruzhan' }, attempts: [],
      knowledge: [
        { mastery: 0.8, lastActivity: new Date('2026-09-01'), topic: { id: 'topic-1', name: 'Functions' } },
        { mastery: 0.2, lastActivity: new Date('2026-09-02'), topic: { id: 'topic-2', name: 'Equations' } },
      ],
    },
    {
      id: 'student-2', user: { name: 'Daniyar' }, attempts: [],
      knowledge: [
        { mastery: 0.6, lastActivity: new Date('2026-09-03'), topic: { id: 'topic-1', name: 'Functions' } },
        { mastery: 0.3, lastActivity: new Date('2026-09-04'), topic: { id: 'topic-2', name: 'Equations' } },
      ],
    },
  ];

  beforeEach(() => {
    prisma = {
      class: { findUnique: jest.fn().mockResolvedValue({ teacherId: 'teacher-1' }) },
      teacher: { findUnique: jest.fn().mockResolvedValue({ userId: teacher.id }) },
      student: { findMany: jest.fn().mockResolvedValue(students), findUnique: jest.fn(), findFirst: jest.fn() },
      attempt: { findMany: jest.fn() },
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  it('returns class mastery, topic strengths and remediation count', async () => {
    await expect(service.getOverview('class-1', teacher)).resolves.toEqual({
      classMastery: 0.475,
      strongTopics: [{ topicId: 'topic-1', topicName: 'Functions', mastery: 0.7 }],
      weakTopics: [{ topicId: 'topic-2', topicName: 'Equations', mastery: 0.25 }],
      studentsNeedingRemediation: 0,
    });
  });

  it('builds a heatmap using the specified green, yellow and red thresholds', async () => {
    const result = await service.getHeatmap('class-1', teacher);

    expect(result.students[0].topics).toEqual([
      { topicId: 'topic-1', mastery: 0.8, status: 'GREEN' },
      { topicId: 'topic-2', mastery: 0.2, status: 'RED' },
    ]);
    expect(result.students[1].topics[0]).toMatchObject({ status: 'YELLOW' });
  });

  it('calculates student trend from recent attempts and last activity', async () => {
    prisma.student.findMany.mockResolvedValue([
      {
        ...students[0],
        attempts: [
          { correct: true, createdAt: new Date('2026-09-06') },
          { correct: true, createdAt: new Date('2026-09-05') },
          { correct: false, createdAt: new Date('2026-09-01') },
          { correct: false, createdAt: new Date('2026-08-30') },
        ],
      },
    ]);

    const result = await service.getStudents('class-1', teacher);

    expect(result.students[0]).toMatchObject({ id: 'student-1', mastery: 0.5, trend: 'improving' });
    expect(result.students[0].lastActive).toEqual(new Date('2026-09-06'));
  });

  it('returns topic strengths, weaknesses and grouped recent mistakes for a student', async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1', user: { name: 'Aruzhan' }, class: { teacherId: 'teacher-1' },
      knowledge: students[0].knowledge,
      mistakes: [
        { topicId: 'topic-2', type: 'CALCULATION_ERROR', topic: { id: 'topic-2', name: 'Equations' } },
        { topicId: 'topic-2', type: 'CALCULATION_ERROR', topic: { id: 'topic-2', name: 'Equations' } },
      ],
    });

    await expect(service.getStudentProfile('student-1', teacher)).resolves.toMatchObject({
      strongTopics: ['Functions'], weakTopics: ['Equations'],
      recentMistakes: [{ topicId: 'topic-2', type: 'CALCULATION_ERROR', count: 2 }],
    });
  });

  it('does not expose an autonomous student profile to a teacher', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1', class: null });

    await expect(service.getStudentProfile('student-1', teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns attempts only for a student enrolled in the requested class', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'student-1' });
    prisma.attempt.findMany.mockResolvedValue([
      {
        id: 'attempt-1', taskId: 'task-1', answer: 'x = 3', correct: true, attemptNumber: 1, createdAt: new Date(),
        task: { content: 'Solve equation', topic: { id: 'topic-2', name: 'Equations' } },
      },
    ]);

    await expect(service.getStudentAttempts('class-1', 'student-1', teacher)).resolves.toMatchObject({
      attempts: [{ id: 'attempt-1', topicName: 'Equations', correct: true }],
    });
  });

  it('fails for a student not enrolled in the class', async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(service.getStudentAttempts('class-1', 'student-2', teacher)).rejects.toBeInstanceOf(NotFoundException);
  });
});
