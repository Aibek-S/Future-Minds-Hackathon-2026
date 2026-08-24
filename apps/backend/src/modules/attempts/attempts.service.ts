import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttemptDto } from './dto/attempt.dto';
import { AnswerCheckerService } from './answer-checker.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const PREREQUISITE_MASTERY = 0.4;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

type Requester = { id: string; role: string };

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly answerChecker: AnswerCheckerService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(taskId: string, studentId: string, dto: CreateAttemptDto, requester: Requester) {
    await this.assertStudentAccess(studentId, requester);
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, topicId: true, difficulty: true, correctAnswer: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const answerCheck = this.answerChecker.evaluate(dto.answer, task.correctAnswer);
    const result = await this.runSerializable(() => this.prisma.$transaction(async (transaction) => {
      const attemptNumber = (await transaction.attempt.count({ where: { taskId, studentId } })) + 1;
      const previous = await transaction.studentKnowledge.findUnique({
        where: { studentId_topicId: { studentId, topicId: task.topicId } },
        select: { mastery: true, attempts: true, correctAttempts: true },
      });
      const masteryBefore = previous?.mastery ?? 0;
      const currentResult = answerCheck.correct ? (attemptNumber === 1 ? 1 : attemptNumber === 2 ? 0.5 : 0.1) : 0;
      const masteryAfter = 0.7 * masteryBefore + 0.3 * currentResult;

      await transaction.attempt.create({
        data: { taskId, studentId, answer: dto.answer, attemptNumber, correct: answerCheck.correct },
      });
      await transaction.studentKnowledge.upsert({
        where: { studentId_topicId: { studentId, topicId: task.topicId } },
        update: {
          mastery: masteryAfter,
          attempts: { increment: 1 },
          correctAttempts: { increment: answerCheck.correct ? 1 : 0 },
        },
        create: {
          studentId,
          topicId: task.topicId,
          mastery: masteryAfter,
          attempts: 1,
          correctAttempts: answerCheck.correct ? 1 : 0,
        },
      });

      if (answerCheck.mistakeType) {
        await transaction.mistake.create({
          data: { studentId, topicId: task.topicId, type: answerCheck.mistakeType },
        });
      }

      return {
        masteryBefore,
        masteryAfter,
        attempts: (previous?.attempts ?? 0) + 1,
        correctAttempts: (previous?.correctAttempts ?? 0) + (answerCheck.correct ? 1 : 0),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    const unlockedTopics = await this.getNewlyUnlockedTopics(
      studentId,
      task.topicId,
      result.masteryBefore,
      result.masteryAfter,
    );
    const payload = { studentId, topicId: task.topicId, correct: answerCheck.correct, masteryAfter: result.masteryAfter };
    this.realtime.emitTaskAttemptSubmitted(payload);
    this.realtime.emitKnowledgeStateUpdated({ ...payload, timestamp: new Date().toISOString() });
    return {
      correct: answerCheck.correct,
      feedback: answerCheck.feedback,
      mistakeType: answerCheck.mistakeType,
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

  private async getNewlyUnlockedTopics(
    studentId: string,
    completedTopicId: string,
    masteryBefore: number,
    masteryAfter: number,
  ) {
    if (masteryBefore > PREREQUISITE_MASTERY || masteryAfter <= PREREQUISITE_MASTERY) {
      return [];
    }
    const topics = await this.prisma.topic.findMany({
      where: { prerequisites: { has: completedTopicId } },
      select: { id: true, name: true, prerequisites: true },
    });
    const knowledge = await this.prisma.studentKnowledge.findMany({ where: { studentId } });
    const masteryByTopic = new Map(knowledge.map((item) => [item.topicId, item.mastery]));
    return topics
      .filter((topic) => topic.prerequisites.every((id) => (masteryByTopic.get(id) ?? 0) > PREREQUISITE_MASTERY))
      .map((topic) => ({ topicId: topic.id, topicName: topic.name }));
  }

  private async runSerializable<T>(operation: () => Promise<T>): Promise<T> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        const isWriteConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!isWriteConflict || attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Unreachable serializable transaction state');
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
