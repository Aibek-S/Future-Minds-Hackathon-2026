import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassesService } from './classes.service';

describe('ClassesService', () => {
  let prisma: {
    teacher: { findUnique: jest.Mock };
    class: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
    student: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: ClassesService;

  const teacherRequester = { id: 'user-teacher-1', role: 'TEACHER' };

  beforeEach(() => {
    prisma = {
      teacher: { findUnique: jest.fn() },
      class: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      student: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new ClassesService(prisma as unknown as PrismaService);
  });

  it('creates a teacher-owned class with a readable code', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ userId: teacherRequester.id });
    prisma.class.create.mockImplementation(async ({ data }) => ({ id: 'class-1', ...data }));

    const result = await service.create('teacher-1', { name: ' 10A ', grade: 10 }, teacherRequester);

    expect(result.name).toBe('10A');
    expect(result.code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    expect(prisma.class.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ teacherId: 'teacher-1' }) }));
  });

  it('lists classes with student counts', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ userId: teacherRequester.id });
    prisma.class.findMany.mockResolvedValue([
      { id: 'class-1', name: '10A', grade: 10, code: '7XKQ2M9B', _count: { students: 24 } },
    ]);

    await expect(service.listForTeacher('teacher-1', teacherRequester)).resolves.toEqual({
      classes: [{ id: 'class-1', name: '10A', grade: 10, code: '7XKQ2M9B', studentCount: 24 }],
    });
  });

  it('enrolls the authenticated student only when the code matches the requested class', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    prisma.class.findFirst.mockResolvedValue({ id: 'class-1' });

    await expect(service.join('class-1', ' 7xkq2m9b ', { id: 'user-student-1', role: 'STUDENT' })).resolves.toEqual({
      classId: 'class-1',
      message: 'Joined successfully',
    });
    expect(prisma.class.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'class-1', code: '7XKQ2M9B' },
    }));
    expect(prisma.student.update).toHaveBeenCalledWith({ where: { id: 'student-1' }, data: { classId: 'class-1' } });
  });

  it('rejects a join by a non-student', async () => {
    await expect(service.join('class-1', '7XKQ2M9B', teacherRequester)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes only an enrolled student after checking class ownership', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.teacher.findUnique.mockResolvedValue({ userId: teacherRequester.id });
    prisma.student.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.removeStudent('class-1', 'student-1', teacherRequester)).resolves.toMatchObject({
      studentId: 'student-1',
      classId: null,
    });
  });

  it('does not remove a student outside the class', async () => {
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.teacher.findUnique.mockResolvedValue({ userId: teacherRequester.id });
    prisma.student.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.removeStudent('class-1', 'student-2', teacherRequester)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('switches all students to autonomous mode before deleting the class', async () => {
    const transaction = { student: { updateMany: jest.fn() }, class: { delete: jest.fn() } };
    prisma.class.findUnique.mockResolvedValue({ teacherId: 'teacher-1' });
    prisma.teacher.findUnique.mockResolvedValue({ userId: teacherRequester.id });
    prisma.$transaction.mockImplementation(async (callback) => callback(transaction));

    await service.delete('class-1', teacherRequester);

    expect(transaction.student.updateMany).toHaveBeenCalledWith({ where: { classId: 'class-1' }, data: { classId: null } });
    expect(transaction.class.delete).toHaveBeenCalledWith({ where: { id: 'class-1' } });
  });
});
