import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import OpenAI, { toFile } from 'openai';
import { Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { Queue, Worker } from 'bullmq';

@Injectable()
export class VoiceFeedbackService implements OnModuleInit, OnModuleDestroy {
  private voiceQueue!: Queue<{ feedbackId: string; userId: string; audioUrl: string }>;
  private voiceWorker!: Worker<{ feedbackId: string; userId: string; audioUrl: string }>;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly realtime: RealtimeGateway) {}
  onModuleInit() {
    const connection = { host: this.config.get<string>('REDIS_HOST') ?? 'localhost', port: Number(this.config.get<string>('REDIS_PORT') ?? 6379) };
    this.voiceQueue = new Queue('voice-feedback-processing', { connection });
    this.voiceWorker = new Worker('voice-feedback-processing', async (job) => this.processLive(job.data.feedbackId, job.data.userId, job.data.audioUrl), { connection });
    void this.resumePendingFeedback();
  }
  async onModuleDestroy() { await Promise.all([this.voiceWorker?.close(), this.voiceQueue?.close()]); }
  async create(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('audio file is required');
    if (!file.mimetype.startsWith('audio/')) throw new BadRequestException('audio must be an audio file');
    const mock = (this.config.get<string>('VOICE_MODE') ?? 'mock') === 'mock';
    const audioUrl = await this.storeAudio(file);
    const feedback = await this.prisma.voiceFeedback.create({ data: {
      userId, audioUrl, status: mock ? 'COMPLETED' : 'PROCESSING',
      ...(mock ? { transcript: 'Mock transcription', analysis: { sentiment: 'positive', summary: 'Voice feedback received' } } : {}),
    }});
    if (mock) this.realtime.emitVoiceFeedbackProcessed({ userId, feedbackId: feedback.id, analysis: feedback.analysis });
    else await this.voiceQueue.add('process', { feedbackId: feedback.id, userId, audioUrl }, { jobId: feedback.id, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 1000, removeOnFail: 1000 });
    return { feedbackId: feedback.id, status: mock ? 'done' : 'processing' };
  }

  private async processLive(feedbackId: string, userId: string, audioUrl: string) {
    try {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) throw new Error('OPENAI_API_KEY is required when VOICE_MODE=live');
      const client = new OpenAI({ apiKey });
      const transcription = await client.audio.transcriptions.create({
        model: this.config.get<string>('VOICE_TRANSCRIPTION_MODEL') ?? 'gpt-4o-mini-transcribe',
        file: await toFile(await readFile(audioUrl.replace('file://', '')), basename(audioUrl), { type: 'audio/webm' }),
      });
      const transcript = transcription.text;
      const completion = await client.chat.completions.create({
        model: this.config.get<string>('VOICE_ANALYSIS_MODEL') ?? 'gpt-4o-mini',
        messages: [{ role: 'system', content: 'Analyze student learning feedback. Return concise JSON with understood, confused, confidence (0..1), and recommendedAction.' }, { role: 'user', content: transcript }],
        response_format: { type: 'json_object' },
      });
      const rawAnalysis = completion.choices[0]?.message?.content ?? '{}';
      let analysis: unknown;
      try { analysis = JSON.parse(rawAnalysis); } catch { analysis = { summary: rawAnalysis }; }
      const feedback = await this.prisma.voiceFeedback.update({ where: { id: feedbackId }, data: { status: 'COMPLETED', transcript, analysis: analysis as Prisma.InputJsonValue } });
      this.realtime.emitVoiceFeedbackProcessed({ userId, feedbackId, analysis: feedback.analysis });
    } catch (error) {
      await this.prisma.voiceFeedback.update({ where: { id: feedbackId }, data: { status: 'FAILED', analysis: { error: error instanceof Error ? error.message : 'Voice processing failed' } } });
    }
  }

  private async resumePendingFeedback() {
    const feedback = await this.prisma.voiceFeedback.findMany({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, select: { id: true, userId: true, audioUrl: true } });
    await Promise.all(feedback.map((item) => this.voiceQueue.add('process', { feedbackId: item.id, userId: item.userId, audioUrl: item.audioUrl }, { jobId: item.id, attempts: 3, backoff: { type: 'exponential', delay: 1000 } }).catch(() => undefined)));
  }
  async get(id: string, userId: string) {
    const item = await this.prisma.voiceFeedback.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Voice feedback not found');
    return { feedbackId: item.id, status: this.toApiStatus(item.status), transcript: item.transcript, analysis: item.analysis };
  }

  private async storeAudio(file: Express.Multer.File) {
    const directory = resolve(this.config.get<string>('VOICE_STORAGE_DIR') ?? 'uploads/voice');
    await mkdir(directory, { recursive: true });
    const extension = extname(file.originalname).slice(0, 12) || '.webm';
    const filePath = join(directory, `${randomUUID()}${extension}`);
    await writeFile(filePath, file.buffer);
    return `file://${filePath.replace(/\\/g, '/')}`;
  }

  private toApiStatus(status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED') {
    if (status === 'COMPLETED') return 'done';
    if (status === 'FAILED') return 'failed';
    return 'processing';
  }
}
