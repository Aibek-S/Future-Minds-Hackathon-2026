import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VoiceFeedbackService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async create(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('audio file is required');
    if (!file.mimetype.startsWith('audio/')) throw new BadRequestException('audio must be an audio file');
    const mock = (this.config.get<string>('VOICE_MODE') ?? 'mock') === 'mock';
    return this.prisma.voiceFeedback.create({ data: {
      userId, audioUrl: `memory://${file.originalname}`, status: mock ? 'COMPLETED' : 'PENDING',
      ...(mock ? { transcript: 'Mock transcription', analysis: { sentiment: 'positive', summary: 'Voice feedback received' } } : {}),
    }});
  }
  async get(id: string, userId: string) {
    const item = await this.prisma.voiceFeedback.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Voice feedback not found');
    return item;
  }
}
