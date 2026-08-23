import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTopicDto, UpdateTopicDto } from './dto/topic.dto';
import { CreateTaskDto, TASK_DIFFICULTIES, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTopics(subjectId?: string) {
    const topics = await this.prisma.topic.findMany({
      where: subjectId ? { subjectId } : undefined,
      orderBy: [{ subjectId: 'asc' }, { createdAt: 'asc' }],
    });
    return { topics };
  }

  async createTopic(dto: CreateTopicDto) {
    await this.ensureSubject(dto.subjectId);
    if (dto.parentTopicId) {
      await this.ensureTopic(dto.parentTopicId);
    }
    await this.ensurePrerequisites(dto.prerequisites ?? []);
    const topic = await this.prisma.topic.create({
      data: {
        name: dto.name,
        subjectId: dto.subjectId,
        parentTopicId: dto.parentTopicId ?? null,
        prerequisites: dto.prerequisites ?? [],
      },
    });
    return topic;
  }

  async updateTopic(id: string, dto: UpdateTopicDto) {
    await this.ensureTopic(id);
    if (dto.parentTopicId) {
      await this.ensureTopic(dto.parentTopicId);
    }
    await this.ensurePrerequisites(dto.prerequisites ?? []);
    return this.prisma.topic.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTopic(id: string) {
    await this.ensureTopic(id);
    await this.prisma.topic.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listTasks(topicId: string, difficulty?: string) {
    await this.ensureTopic(topicId);
    if (difficulty && !TASK_DIFFICULTIES.includes(difficulty as (typeof TASK_DIFFICULTIES)[number])) {
      throw new BadRequestException('difficulty must be easy, medium, or hard');
    }
    const tasks = await this.prisma.task.findMany({
      where: { topicId, ...(difficulty ? { difficulty } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    return { tasks };
  }

  async createTask(topicId: string, dto: CreateTaskDto) {
    await this.ensureTopic(topicId);
    return this.prisma.task.create({
      data: {
        topicId,
        difficulty: dto.difficulty,
        content: dto.content,
        source: dto.source ?? 'manual',
      },
    });
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    await this.ensureTask(id);
    return this.prisma.task.update({ where: { id }, data: dto });
  }

  async deleteTask(id: string) {
    await this.ensureTask(id);
    await this.prisma.task.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureSubject(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id }, select: { id: true } });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
  }

  private async ensureTopic(id: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id }, select: { id: true } });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
    return topic;
  }

  private async ensureTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { id: true } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  private async ensurePrerequisites(ids: string[]) {
    if (!ids.length) {
      return;
    }
    const count = await this.prisma.topic.count({ where: { id: { in: ids } } });
    if (count !== ids.length) {
      throw new NotFoundException('Prerequisite topic not found');
    }
  }
}
