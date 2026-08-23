import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentMode, AssignmentStatus, Prisma } from '@prisma/client';
import { AnswerCheckerService } from '../attempts/answer-checker.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAssignmentDto, SubmitAssignmentDto, VerifyAssignmentDto } from './dto/assignment.dto';

type Requester = { id: string; role: string };

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly answerChecker: AnswerCheckerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(classId: string, dto: CreateAssignmentDto, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    await this.ensureTopic(dto.topicId);
    await this.ensureLessonBelongsToClass(dto.lessonId, classId);

    const targetIds = dto.isUnique ? [...new Set(dto.targetIds ?? [])] : undefined;
    if (dto.isUnique && !targetIds?.length) {
      throw new BadRequestException('targetIds are required for unique assignments');
    }
    const students = await this.prisma.student.findMany({
      where: { classId, ...(targetIds ? { id: { in: targetIds } } : {}) },
      select: { id: true },
    });
    if (targetIds && students.length !== targetIds.length) {
      throw new BadRequestException('Every target student must be enrolled in this class');
    }
    if (!students.length) {
      throw new BadRequestException('No enrolled students available for this assignment');
    }

    const taskIds = [...new Set(dto.taskIds ?? [])];
    if (dto.mode === AssignmentMode.ONLINE && !taskIds.length) {
      throw new BadRequestException('taskIds are required for online assignments');
    }
    const tasks = taskIds.length
      ? await this.prisma.task.findMany({ where: { id: { in: taskIds }, topicId: dto.topicId }, select: { id: true } })
      : [];
    if (tasks.length !== taskIds.length) {
      throw new BadRequestException('Every task must belong to the assignment topic');
    }

    return this.prisma.assignment.create({
      data: {
        classId,
        topicId: dto.topicId,
        lessonId: dto.lessonId,
        mode: dto.mode,
        isUnique: dto.isUnique ?? false,
        targetIds: students.map((student) => student.id),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        tasks: { connect: tasks },
        studentAssignments: { create: students.map((student) => ({ studentId: student.id })) },
      },
      include: { studentAssignments: true },
    });
  }

  async getById(assignmentId: string, requester: Requester) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: { select: { teacherId: true } },
        topic: { select: { id: true, name: true } },
        lesson: { select: { id: true, date: true } },
        tasks: { select: { id: true, content: true, difficulty: true } },
        studentAssignments: {
          include: { student: { include: { user: { select: { id: true, name: true } } } } },
        },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    await this.assertTeacherIdAccess(assignment.class.teacherId, requester);
    const { class: classroom, ...result } = assignment;
    return result;
  }

  async submit(studentAssignmentId: string, dto: SubmitAssignmentDto, requester: Requester) {
    const studentAssignment = await this.prisma.studentAssignment.findUnique({
      where: { id: studentAssignmentId },
      include: {
        student: { select: { userId: true } },
        assignment: { include: { tasks: { select: { id: true, correctAnswer: true } } } },
      },
    });
    if (!studentAssignment) {
      throw new NotFoundException('Student assignment not found');
    }
    if (requester.role !== 'STUDENT' || studentAssignment.student.userId !== requester.id) {
      throw new ForbiddenException('You can submit only your own assignments');
    }

    if (studentAssignment.assignment.mode === AssignmentMode.OFFLINE) {
      if (!dto.submittedInClass) {
        throw new BadRequestException('submittedInClass must be true for offline assignments');
      }
      return this.prisma.studentAssignment.update({
        where: { id: studentAssignmentId },
        data: { status: AssignmentStatus.PENDING_VERIFICATION, submission: { submittedInClass: true } },
      });
    }

    const answers = dto.answers ?? [];
    const taskIds = new Set(studentAssignment.assignment.tasks.map((task) => task.id));
    if (
      !answers.length
      || answers.length !== taskIds.size
      || new Set(answers.map((answer) => answer.taskId)).size !== taskIds.size
      || answers.some((answer) => !taskIds.has(answer.taskId))
    ) {
      throw new BadRequestException('Provide exactly one answer for every assignment task');
    }
    const taskById = new Map(studentAssignment.assignment.tasks.map((task) => [task.id, task]));
    const results = answers.map((answer) => {
      const check = this.answerChecker.evaluate(answer.answer, taskById.get(answer.taskId)?.correctAnswer);
      return { ...answer, ...check };
    });

    return this.prisma.studentAssignment.update({
      where: { id: studentAssignmentId },
      data: { status: AssignmentStatus.AI_GRADED, submission: { answers: results } as Prisma.InputJsonValue },
    });
  }

  async verify(studentAssignmentId: string, dto: VerifyAssignmentDto, requester: Requester) {
    const studentAssignment = await this.prisma.studentAssignment.findUnique({
      where: { id: studentAssignmentId },
      include: {
        student: { select: { userId: true } },
        assignment: { include: { class: { select: { teacherId: true } } } },
      },
    });
    if (!studentAssignment) {
      throw new NotFoundException('Student assignment not found');
    }
    await this.assertTeacherIdAccess(studentAssignment.assignment.class.teacherId, requester);
    if (studentAssignment.assignment.mode !== AssignmentMode.OFFLINE) {
      throw new BadRequestException('Only offline assignments require teacher verification');
    }
    if (studentAssignment.status !== AssignmentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Only pending assignments can be verified');
    }
    if (!this.wasSubmittedInClass(studentAssignment.submission)) {
      throw new BadRequestException('The student has not marked this assignment as submitted in class');
    }
    if (dto.action === 'REJECT' && !dto.comment?.trim()) {
      throw new BadRequestException('A comment is required when requesting revision');
    }

    const submission = this.addVerificationComment(studentAssignment.submission, dto.action === 'REJECT' ? dto.comment!.trim() : undefined);
    const status = dto.action === 'APPROVE' ? AssignmentStatus.TEACHER_VERIFIED : AssignmentStatus.REVISION_REQUIRED;
    const updated = await this.prisma.studentAssignment.update({
      where: { id: studentAssignmentId },
      data: { status, submission },
    });
    if (dto.action === 'REJECT') {
      this.notificationsService.notifyAssignmentRevision(studentAssignment.student.userId, {
        studentAssignmentId,
        comment: dto.comment!.trim(),
      });
    }
    return updated;
  }

  private async assertClassOwner(classId: string, requester: Requester) {
    const classroom = await this.prisma.class.findUnique({ where: { id: classId }, select: { teacherId: true } });
    if (!classroom) {
      throw new NotFoundException('Class not found');
    }
    await this.assertTeacherIdAccess(classroom.teacherId, requester);
  }

  private async assertTeacherIdAccess(teacherId: string, requester: Requester) {
    if (requester.role === 'ADMIN') {
      return;
    }
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
    if (!teacher || requester.role !== 'TEACHER' || teacher.userId !== requester.id) {
      throw new ForbiddenException('You can manage only assignments in your own classes');
    }
  }

  private async ensureTopic(topicId: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
  }

  private async ensureLessonBelongsToClass(lessonId: string | undefined, classId: string) {
    if (!lessonId) {
      return;
    }
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { classId: true } });
    if (!lesson || lesson.classId !== classId) {
      throw new BadRequestException('lessonId must belong to this class');
    }
  }

  private addVerificationComment(submission: Prisma.JsonValue | null, comment: string | undefined): Prisma.InputJsonValue {
    const base = submission && typeof submission === 'object' && !Array.isArray(submission) ? submission : {};
    return { ...base, ...(comment ? { verificationComment: comment } : {}) } as Prisma.InputJsonValue;
  }

  private wasSubmittedInClass(submission: Prisma.JsonValue | null) {
    return typeof submission === 'object'
      && submission !== null
      && !Array.isArray(submission)
      && submission.submittedInClass === true;
  }
}
