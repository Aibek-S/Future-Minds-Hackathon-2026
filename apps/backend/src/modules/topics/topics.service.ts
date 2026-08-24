import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTopicDto, UpdateTopicDto } from './dto/topic.dto';
import { CreateTaskDto, TASK_DIFFICULTIES, UpdateTaskDto } from './dto/task.dto';
import { CreateMaterialDto } from './dto/topic.dto';
import { EmbeddingsService } from '../../ai/embeddings.service';
import { randomUUID } from 'crypto';

@Injectable()
export class TopicsService implements OnModuleInit, OnModuleDestroy {
  private materialQueue!: Queue<{ ingestionId: string }>;
  private materialWorker!: Worker<{ ingestionId: string }>;

  constructor(private readonly prisma: PrismaService, private readonly embeddings: EmbeddingsService, private readonly config: ConfigService) {}

  onModuleInit() {
    const connection = { host: this.config.get<string>('REDIS_HOST') ?? 'localhost', port: Number(this.config.get<string>('REDIS_PORT') ?? 6379) };
    this.materialQueue = new Queue('material-vectorization', { connection });
    this.materialWorker = new Worker('material-vectorization', async (job) => this.vectorize(job.data.ingestionId), { connection });
    void this.resumePendingIngestions();
  }

  async onModuleDestroy() { await Promise.all([this.materialWorker?.close(), this.materialQueue?.close()]); }

  async addMaterial(topicId: string, dto: CreateMaterialDto) {
    await this.ensureTopic(topicId);
    const ingestion = await this.prisma.materialIngestion.create({ data: { topicId, content: dto.content!, sourceUrl: dto.sourceUrl } });
    await this.materialQueue.add('vectorize', { ingestionId: ingestion.id }, { jobId: ingestion.id, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 1000, removeOnFail: 1000 });
    return { materialId: ingestion.id, status: 'vectorizing' };
  }

  async getMaterialStatus(topicId: string, materialId: string) {
    const ingestion = await this.prisma.materialIngestion.findFirst({ where: { id: materialId, topicId } });
    if (!ingestion) throw new NotFoundException('Material ingestion not found');
    return { materialId: ingestion.id, status: ingestion.status.toLowerCase(), error: ingestion.error };
  }

  private async vectorize(ingestionId: string) {
    const ingestion = await this.prisma.materialIngestion.findUnique({ where: { id: ingestionId } });
    if (!ingestion) return;
    const chunks = this.chunkText(ingestion.content);
    try {
      let materialVectorId: string | undefined;
      for (const content of chunks) {
        const vectorId = randomUUID();
        materialVectorId ??= vectorId;
        const embedding = `[${(await this.embeddings.embed(content)).join(',')}]`;
        await this.prisma.$executeRaw`INSERT INTO "MaterialVector" (id, "topicId", content, metadata, embedding) VALUES (${vectorId}, ${ingestion.topicId}, ${content}, ${JSON.stringify({ sourceUrl: ingestion.sourceUrl ?? null, ingestionId, chunkCount: chunks.length })}::jsonb, ${embedding}::vector)`;
      }
      await this.prisma.materialIngestion.update({ where: { id: ingestionId }, data: { status: 'COMPLETED', materialVectorId } });
    } catch (error) {
      await this.prisma.materialIngestion.update({ where: { id: ingestionId }, data: { status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 500) : 'Vectorization failed' } });
    }
  }

  private async resumePendingIngestions() {
    const pending = await this.prisma.materialIngestion.findMany({ where: { status: 'VECTORIZING' }, select: { id: true } });
    await Promise.all(pending.map((item) => this.materialQueue.add('vectorize', { ingestionId: item.id }, { jobId: item.id, attempts: 3, backoff: { type: 'exponential', delay: 1000 } }).catch(() => undefined)));
  }

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

  private chunkText(content: string) {
    const max = 1200;
    const chunks: string[] = [];
    for (let start = 0; start < content.length; start += max) chunks.push(content.slice(start, start + max));
    return chunks;
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
