import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeedbackTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLessonDto, CreateLessonFeedbackDto, UpdateLessonDto } from './dto/lesson.dto';

type Requester = { id: string; role: string };

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(classId: string, dto: CreateLessonDto, requester: Requester) {
    const classroom = await this.assertClassOwner(classId, requester);
    await this.ensureTopic(dto.topicId);
    return this.prisma.lesson.create({
      data: {
        classId,
        teacherId: classroom.teacherId,
        topicId: dto.topicId,
        date: new Date(dto.date),
        planJson: dto.planJson as Prisma.InputJsonValue,
      },
      include: { topic: { select: { id: true, name: true } } },
    });
  }

  async listForClass(classId: string, from: string | undefined, to: string | undefined, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    const date = {
      ...(from ? { gte: this.parseDate(from, 'from') } : {}),
      ...(to ? { lte: this.parseDate(to, 'to') } : {}),
    };
    return this.prisma.lesson.findMany({
      where: { classId, ...(Object.keys(date).length ? { date } : {}) },
      orderBy: { date: 'asc' },
      include: {
        topic: { select: { id: true, name: true } },
        _count: { select: { assignments: true, feedbacks: true } },
      },
    });
  }

  async getById(lessonId: string, requester: Requester) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: { select: { id: true, name: true } },
        class: { select: { teacherId: true } },
        assignments: {
          include: {
            studentAssignments: {
              include: { student: { include: { user: { select: { id: true, name: true } } } } },
            },
          },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    await this.assertTeacherIdAccess(lesson.class.teacherId, requester);
    const { class: classroom, ...result } = lesson;
    return result;
  }

  async update(lessonId: string, dto: UpdateLessonDto, requester: Requester) {
    const lesson = await this.findOwnedLesson(lessonId, requester);
    if (dto.topicId) {
      await this.ensureTopic(dto.topicId);
    }
    return this.prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.topicId ? { topicId: dto.topicId } : {}),
        ...(dto.planJson ? { planJson: dto.planJson as Prisma.InputJsonValue } : {}),
      },
      include: { topic: { select: { id: true, name: true } } },
    });
  }

  async delete(lessonId: string, requester: Requester) {
    const lesson = await this.findOwnedLesson(lessonId, requester);
    await this.prisma.lesson.delete({ where: { id: lesson.id } });
    return { id: lesson.id, message: 'Lesson deleted' };
  }

  async createFeedback(lessonId: string, dto: CreateLessonFeedbackDto, requester: Requester) {
    const student = await this.getRequesterStudent(requester);
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, date: true, classId: true } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    if (lesson.date.getTime() > Date.now()) {
      throw new ForbiddenException('Feedback is available only after the lesson date');
    }
    if (student.classId !== lesson.classId) {
      throw new ForbiddenException('You can leave feedback only for your class lessons');
    }
    return this.prisma.feedback.create({
      data: {
        userId: requester.id,
        targetType: FeedbackTargetType.LESSON,
        targetId: lesson.id,
        rating: dto.rating,
        commentOrAudioUrl: dto.commentOrAudioUrl,
      },
    });
  }

  async getFeedback(lessonId: string, requester: Requester) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, class: { select: { teacherId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    await this.assertTeacherIdAccess(lesson.class.teacherId, requester);
    return this.prisma.feedback.findMany({
      where: { targetType: FeedbackTargetType.LESSON, targetId: lessonId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  private async findOwnedLesson(lessonId: string, requester: Requester) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, class: { select: { teacherId: true } } },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    await this.assertTeacherIdAccess(lesson.class.teacherId, requester);
    return lesson;
  }

  private async assertClassOwner(classId: string, requester: Requester) {
    const classroom = await this.prisma.class.findUnique({ where: { id: classId }, select: { teacherId: true } });
    if (!classroom) {
      throw new NotFoundException('Class not found');
    }
    await this.assertTeacherIdAccess(classroom.teacherId, requester);
    return classroom;
  }

  private async assertTeacherIdAccess(teacherId: string, requester: Requester) {
    if (requester.role === 'ADMIN') {
      return;
    }
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
    if (!teacher || requester.role !== 'TEACHER' || teacher.userId !== requester.id) {
      throw new ForbiddenException('You can manage only lessons in your own classes');
    }
  }

  private async getRequesterStudent(requester: Requester) {
    const student = await this.prisma.student.findUnique({
      where: { userId: requester.id },
      select: { id: true, classId: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }

  private async ensureTopic(topicId: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
  }

  private parseDate(value: string, name: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new NotFoundException(`${name} must be a valid ISO date`);
    }
    return parsed;
  }
}
