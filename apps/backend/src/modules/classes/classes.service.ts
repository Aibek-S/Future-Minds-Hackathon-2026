import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/class.dto';

const generateClassCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);
type Requester = { id: string; role: string };

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, dto: CreateClassDto, requester: Requester) {
    await this.assertTeacherAccess(teacherId, requester);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.class.create({
          data: { teacherId, name: dto.name.trim(), grade: dto.grade, code: generateClassCode() },
          select: { id: true, name: true, grade: true, code: true, teacherId: true, createdAt: true },
        });
      } catch (error) {
        if (!this.isClassCodeConflict(error) || attempt === 4) {
          throw error;
        }
      }
    }

    throw new ConflictException('Could not generate a unique class code');
  }

  async listForTeacher(teacherId: string, requester: Requester) {
    await this.assertTeacherAccess(teacherId, requester);
    const classes = await this.prisma.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { students: true } } },
    });

    return {
      classes: classes.map(({ _count, ...item }) => ({ ...item, studentCount: _count.students })),
    };
  }

  async join(classId: string, code: string, requester: Requester) {
    const student = await this.getRequesterStudent(requester);
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, code: code.trim().toUpperCase() },
      select: { id: true },
    });
    if (!classroom) {
      throw new NotFoundException('Class not found or class code is invalid');
    }

    await this.prisma.student.update({ where: { id: student.id }, data: { classId: classroom.id } });
    return { classId: classroom.id, message: 'Joined successfully' };
  }

  async removeStudent(classId: string, studentId: string, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    const result = await this.prisma.student.updateMany({
      where: { id: studentId, classId },
      data: { classId: null },
    });
    if (!result.count) {
      throw new NotFoundException('Student is not enrolled in this class');
    }
    return { studentId, classId: null, message: 'Student removed from class' };
  }

  async delete(classId: string, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.student.updateMany({ where: { classId }, data: { classId: null } });
      await transaction.class.delete({ where: { id: classId } });
    });
    return { id: classId, message: 'Class deleted; students switched to autonomous mode' };
  }

  private async assertTeacherAccess(teacherId: string, requester: Requester) {
    if (requester.role === 'ADMIN') {
      return;
    }
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    if (requester.role !== 'TEACHER' || teacher.userId !== requester.id) {
      throw new ForbiddenException('You can manage only your own classes');
    }
  }

  private async assertClassOwner(classId: string, requester: Requester) {
    const classroom = await this.prisma.class.findUnique({ where: { id: classId }, select: { teacherId: true } });
    if (!classroom) {
      throw new NotFoundException('Class not found');
    }
    await this.assertTeacherAccess(classroom.teacherId, requester);
  }

  private async getRequesterStudent(requester: Requester) {
    if (requester.role !== 'STUDENT') {
      throw new ForbiddenException('Only students can join a class');
    }
    const student = await this.prisma.student.findUnique({ where: { userId: requester.id }, select: { id: true } });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }

  private isClassCodeConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
      && Array.isArray(error.meta?.target)
      && error.meta.target.includes('code');
  }
}
