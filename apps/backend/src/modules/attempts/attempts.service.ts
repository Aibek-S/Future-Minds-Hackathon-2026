import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MistakeType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttemptDto } from './dto/attempt.dto';

const COMPLETED_MASTERY = 0.8;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

type Requester = { id: string; role: string };

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(taskId: string, studentId: string, dto: CreateAttemptDto, requester: Requester) {
    await this.assertStudentAccess(studentId, requester);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, topicId: true, difficulty: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const correct = this.mockCheck(dto.answer);
    const result = await this.prisma.$transaction(async (transaction) => {
      const attemptNumber = (await transaction.attempt.count({ where: { taskId, studentId } })) + 1;
      const previous = await transaction.studentKnowledge.findUnique({
        where: { studentId_topicId: { studentId, topicId: task.topicId } },
        select: { mastery: true, attempts: true, correctAttempts: true },
      });
      const masteryBefore = previous?.mastery ?? 0;
      const currentResult = correct ? (attemptNumber === 1 ? 1 : attemptNumber === 2 ? 0.5 : 0.1) : 0;
      const masteryAfter = Number((0.7 * masteryBefore + 0.3 * currentResult).toFixed(3));

      const attempt = await transaction.attempt.create({
        data: { taskId, studentId, answer: dto.answer, attemptNumber, correct },
      });
      await transaction.studentKnowledge.upsert({
        where: { studentId_topicId: { studentId, topicId: task.topicId } },
        update: {
          mastery: masteryAfter,
          attempts: { increment: 1 },
          correctAttempts: { increment: correct ? 1 : 0 },
        },
        create: {
          studentId,
          topicId: task.topicId,
          mastery: masteryAfter,
          attempts: 1,
          correctAttempts: correct ? 1 : 0,
        },
      });

      const mistakeType = correct ? null : this.classifyMistake(dto.answer);
      if (mistakeType) {
        await transaction.mistake.create({ data: { studentId, topicId: task.topicId, type: mistakeType } });
      }

      return {
        attempt,
        masteryBefore,
        masteryAfter,
        attempts: (previous?.attempts ?? 0) + 1,
        correctAttempts: (previous?.correctAttempts ?? 0) + (correct ? 1 : 0),
        mistakeType,
      };
    });

    const unlockedTopics = await this.getUnlockedTopics(studentId, task.topicId);
    return {
      correct,
      feedback: correct ? 'Верно! Ответ принят в demo-режиме.' : 'Ответ отмечен как ошибка. Попробуй разобрать шаги решения.',
      mistakeType: result.mistakeType,
      updatedMastery: {
        topicId: task.topicId,
        masteryBefore: result.masteryBefore,
        masteryAfter: result.masteryAfter,
        attempts: result.attempts,
        correctAttempts: result.correctAttempts,
      },
      nextTaskDifficulty: this.getNextDifficulty(task.difficulty, result.masteryAfter),
      prerequisiteUnlocked: unlockedTopics,
    };
  }

  private mockCheck(answer: string) {
    return /^(correct|правильно)$/i.test(answer.trim());
  }

  private classifyMistake(answer: string): MistakeType {
    const normalized = answer.trim().toLowerCase();
    if (!normalized || /не знаю|не понял|услови|dont know|don't know|unknown/.test(normalized)) {
      return MistakeType.READING_ERROR;
    }
    if (/формул|теорем|правил|понят/.test(normalized)) {
      return MistakeType.CONCEPTUAL_ERROR;
    }
    return MistakeType.CALCULATION_ERROR;
  }

  private getNextDifficulty(difficulty: string, mastery: number) {
    const index = DIFFICULTIES.indexOf(difficulty as (typeof DIFFICULTIES)[number]);
    if (mastery >= 0.8 && index < DIFFICULTIES.length - 1) {
      return DIFFICULTIES[index + 1];
    }
    if (mastery < 0.3 && index > 0) {
      return DIFFICULTIES[index - 1];
    }
    return DIFFICULTIES[index] ?? 'medium';
  }

  private async getUnlockedTopics(studentId: string, completedTopicId: string) {
    const topics = await this.prisma.topic.findMany({
      where: { prerequisites: { has: completedTopicId } },
      select: { id: true, name: true, prerequisites: true },
    });
    const knowledge = await this.prisma.studentKnowledge.findMany({ where: { studentId } });
    const masteryByTopic = new Map(knowledge.map((item) => [item.topicId, item.mastery]));
    return topics
      .filter((topic) => topic.prerequisites.every((id) => (masteryByTopic.get(id) ?? 0) >= COMPLETED_MASTERY))
      .map((topic) => ({ topicId: topic.id, topicName: topic.name }));
  }

  private async assertStudentAccess(studentId: string, requester: Requester) {
    if (requester.role === 'TEACHER' || requester.role === 'ADMIN') {
      return;
    }
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.userId !== requester.id) {
      throw new ForbiddenException('You can submit attempts only for your own profile');
    }
  }
}
