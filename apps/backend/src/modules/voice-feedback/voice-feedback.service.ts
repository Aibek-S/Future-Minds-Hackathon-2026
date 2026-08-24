import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import OpenAI, { toFile } from 'openai';
import { Prisma } from '@prisma/client';

@Injectable()
export class VoiceFeedbackService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly realtime: RealtimeGateway) {}
  async create(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('audio file is required');
    if (!file.mimetype.startsWith('audio/')) throw new BadRequestException('audio must be an audio file');
    const mock = (this.config.get<string>('VOICE_MODE') ?? 'mock') === 'mock';
    const feedback = await this.prisma.voiceFeedback.create({ data: {
      userId, audioUrl: `memory://${file.originalname}`, status: mock ? 'COMPLETED' : 'PROCESSING',
      ...(mock ? { transcript: 'Mock transcription', analysis: { sentiment: 'positive', summary: 'Voice feedback received' } } : {}),
    }});
    if (mock) this.realtime.emitVoiceFeedbackProcessed({ userId, feedbackId: feedback.id, analysis: feedback.analysis });
    else setImmediate(() => { void this.processLive(feedback.id, userId, file); });
    return { feedbackId: feedback.id, status: mock ? 'done' : 'processing' };
  }

  private async processLive(feedbackId: string, userId: string, file: Express.Multer.File) {
    try {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) throw new Error('OPENAI_API_KEY is required when VOICE_MODE=live');
      const client = new OpenAI({ apiKey });
      const transcription = await client.audio.transcriptions.create({
        model: this.config.get<string>('VOICE_TRANSCRIPTION_MODEL') ?? 'gpt-4o-mini-transcribe',
        file: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
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
  async get(id: string, userId: string) {
    const item = await this.prisma.voiceFeedback.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Voice feedback not found');
    return item;
  }
}
