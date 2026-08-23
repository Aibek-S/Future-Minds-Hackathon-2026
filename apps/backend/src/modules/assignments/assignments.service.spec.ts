import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AssignmentMode, AssignmentStatus } from '@prisma/client';
import { AnswerCheckerService } from '../attempts/answer-checker.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsService', () => {
  let prisma: {
    class: { findUnique: jest.Mock };
    teacher: { findUnique: jest.Mock };
    topic: { findUnique: jest.Mock };
    lesson: { findUnique: jest.Mock };
    student: { findMany: jest.Mock };
    task: { findMany: jest.Mock };
    assignment: { create: jest.Mock; findUnique: jest.Mock };
    studentAssignment: { findUnique: jest.Mock; update: jest.Mock };
  };
  let answerChecker: { evaluate: jest.Mock };
  let service: AssignmentsService;

  const teacher = { id: 'teacher-user', role: 'TEACHER' };

  beforeEach(() => {
    prisma = {
      class: { findUnique: jest.fn() },
      teacher: { findUnique: jest.fn().mockResolvedValue({ userId: teacher.id }) },
      topic: { findUnique: jest.fn().mockResolvedValue({ id: 'topic-1' }) },
      lesson: { findUnique: jest.fn() },
      student: { findMany: jest.fn().mockResolvedValue([{ id: 'student-1' }, { id: 'student-2' }]) },
      task: { findMany: jest.fn().mockResolvedValue([{ id: 'task-1' }]) },
      assignment: { create: jest.fn(), findUnique: jest.fn() },
      studentAssignment: { findUnique: jest.fn(), update: jest.fn() },
    };
    answerChecker = { evaluate: jest.fn().mockReturnValue({ correct: true, feedback: 'Correct', mistakeType: null }) };
    service = new AssignmentsService(
      prisma as unknown as PrismaService,
      answerChecker as unknown as AnswerCheckerService,
    );
  });

  it('issues an online assignment to all enrolled students', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.assignment.create.mockImplementation(async ({ data }) => ({ id: 'assignment-1', ...data }));

    const result = await service.create('class-1', {
      topicId: 'topic-1', mode: AssignmentMode.ONLINE, taskIds: ['task-1'], dueDate: '2026-09-05T23:59:00.000Z',
    }, teacher);

    expect(result).toMatchObject({ id: 'assignment-1', classId: 'class-1', targetIds: ['student-1', 'student-2'] });
    expect(prisma.assignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ studentAssignments: { create: [{ studentId: 'student-1' }, { studentId: 'student-2' }] } }),
    }));
  });

  it('requires targets for a unique assignment', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });

    await expect(service.create('class-1', {
      topicId: 'topic-1', mode: AssignmentMode.OFFLINE, isUnique: true,
    }, teacher)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires online tasks to belong to the selected topic', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.task.findMany.mockResolvedValue([]);

    await expect(service.create('class-1', {
      topicId: 'topic-1', mode: AssignmentMode.ONLINE, taskIds: ['other-topic-task'],
    }, teacher)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('AI-grades exactly one answer for each online assignment task', async () => {
    prisma.studentAssignment.findUnique.mockResolvedValue({
      id: 'sa-1', student: { userId: 'student-user' },
      assignment: { mode: AssignmentMode.ONLINE, tasks: [{ id: 'task-1', correctAnswer: 'x = 3' }] },
    });
    prisma.studentAssignment.update.mockResolvedValue({ id: 'sa-1', status: AssignmentStatus.AI_GRADED });

    await expect(service.submit('sa-1', { answers: [{ taskId: 'task-1', answer: 'x = 3' }] }, {
      id: 'student-user', role: 'STUDENT',
    })).resolves.toMatchObject({ status: AssignmentStatus.AI_GRADED });
    expect(answerChecker.evaluate).toHaveBeenCalledWith('x = 3', 'x = 3');
  });

  it('rejects duplicate answers in an online submission', async () => {
    prisma.studentAssignment.findUnique.mockResolvedValue({
      id: 'sa-1', student: { userId: 'student-user' },
      assignment: { mode: AssignmentMode.ONLINE, tasks: [{ id: 'task-1' }, { id: 'task-2' }] },
    });

    await expect(service.submit('sa-1', {
      answers: [{ taskId: 'task-1', answer: 'a' }, { taskId: 'task-1', answer: 'b' }],
    }, { id: 'student-user', role: 'STUDENT' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks offline work as pending only for the assigned student', async () => {
    prisma.studentAssignment.findUnique.mockResolvedValue({
      id: 'sa-1', student: { userId: 'student-user' }, assignment: { mode: AssignmentMode.OFFLINE, tasks: [] },
    });
    prisma.studentAssignment.update.mockResolvedValue({ id: 'sa-1', status: AssignmentStatus.PENDING_VERIFICATION });

    await expect(service.submit('sa-1', { submittedInClass: true }, { id: 'student-user', role: 'STUDENT' }))
      .resolves.toMatchObject({ status: AssignmentStatus.PENDING_VERIFICATION });
  });

  it('requires a teacher comment when requesting an offline revision', async () => {
    prisma.studentAssignment.findUnique.mockResolvedValue({
      id: 'sa-1', status: AssignmentStatus.PENDING_VERIFICATION, submission: { submittedInClass: true },
      assignment: { mode: AssignmentMode.OFFLINE, class: { teacherId: 'teacher-1' } },
    });

    await expect(service.verify('sa-1', { action: 'REJECT' }, teacher)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not let another student submit the assigned work', async () => {
    prisma.studentAssignment.findUnique.mockResolvedValue({
      id: 'sa-1', student: { userId: 'student-user' }, assignment: { mode: AssignmentMode.OFFLINE, tasks: [] },
    });

    await expect(service.submit('sa-1', { submittedInClass: true }, { id: 'other-student', role: 'STUDENT' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
