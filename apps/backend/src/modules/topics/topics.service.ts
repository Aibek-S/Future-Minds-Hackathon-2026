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
      await this.ensureParentInSubject(dto.parentTopicId, dto.subjectId);
    }
    await this.ensurePrerequisites(dto.prerequisites ?? [], dto.subjectId);
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
    const topic = await this.ensureTopic(id);
    if (dto.parentTopicId) {
      if (dto.parentTopicId === id) {
        throw new BadRequestException('A topic cannot be its own parent');
      }
      await this.ensureParentInSubject(dto.parentTopicId, topic.subjectId);
      await this.assertNoParentCycle(id, dto.parentTopicId);
    }
    if (dto.prerequisites !== undefined) {
      await this.ensurePrerequisites(dto.prerequisites, topic.subjectId);
      await this.assertNoPrerequisiteCycle(id, dto.prerequisites);
    }
    return this.prisma.topic.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTopic(id: string) {
    await this.ensureTopic(id);
    const dependents = await this.prisma.topic.findMany({
      where: { prerequisites: { has: id } },
      select: { id: true, name: true },
    });
    if (dependents.length) {
      throw new BadRequestException(
        `Cannot delete topic used as a prerequisite: ${dependents.map((topic) => topic.name).join(', ')}`,
      );
    }
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
        correctAnswer: dto.correctAnswer ?? null,
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
    const topic = await this.prisma.topic.findUnique({ where: { id }, select: { id: true, subjectId: true } });
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

  private async ensureParentInSubject(parentTopicId: string, subjectId: string) {
    const parent = await this.ensureTopic(parentTopicId);
    if (parent.subjectId !== subjectId) {
      throw new BadRequestException('Parent topic must belong to the same subject');
    }
  }

  private async ensurePrerequisites(ids: string[], subjectId: string) {
    if (!ids.length) {
      return;
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Prerequisites must be unique');
    }
    const count = await this.prisma.topic.count({ where: { id: { in: ids }, subjectId } });
    if (count !== ids.length) {
      throw new BadRequestException('Prerequisites must belong to the same subject');
    }
  }

  private async assertNoParentCycle(topicId: string, parentTopicId: string) {
    const visited = new Set<string>();
    let currentId: string | null = parentTopicId;

    while (currentId) {
      if (currentId === topicId) {
        throw new BadRequestException('Parent topic creates a cycle');
      }
      if (visited.has(currentId)) {
        throw new BadRequestException('Topic hierarchy already contains a cycle');
      }
      visited.add(currentId);
      const current: { parentTopicId: string | null } | null = await this.prisma.topic.findUnique({
        where: { id: currentId },
        select: { parentTopicId: true },
      });
      currentId = current?.parentTopicId ?? null;
    }
  }

  private async assertNoPrerequisiteCycle(topicId: string, prerequisiteIds: string[]) {
    const visited = new Set<string>();
    const pending = [...prerequisiteIds];

    while (pending.length) {
      const currentId = pending.pop()!;
      if (currentId === topicId) {
        throw new BadRequestException('Prerequisites create a cycle');
      }
      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);
      const current = await this.prisma.topic.findUnique({
        where: { id: currentId },
        select: { prerequisites: true },
      });
      pending.push(...(current?.prerequisites ?? []));
    }
  }
}
