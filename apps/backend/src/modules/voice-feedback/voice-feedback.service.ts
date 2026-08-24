import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { AI_TOOL_DEFINITIONS, toOpenAITools } from '../../ai/tools/ai-tools.registry';
import { getTaskConfig } from '../../ai/tasks';

@Injectable()
export class VoiceFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  /**
   * Creates feedback from a transcript.
   *
   * STT happens client-side (browser), so the backend only receives the
   * final text. Analysis runs on the backend through the AI gateway using
   * the FEEDBACK prompt, then the result is stored.
   */
  async create(userId: string, transcript: string) {
    const cleaned = transcript.trim();
    if (!cleaned) {
      throw new BadRequestException('transcript is required');
    }
    if (cleaned.length > 2000) {
      throw new BadRequestException('transcript is too long');
    }

    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    const analysis = await this.analyze(cleaned, student?.id);

    const feedback = await this.prisma.voiceFeedback.create({
      data: {
        userId,
        transcript: cleaned,
        status: 'COMPLETED',
        analysis: analysis as Prisma.InputJsonValue,
      },
    });

    return { feedbackId: feedback.id, status: 'done', analysis: feedback.analysis };
  }

  async get(id: string, userId: string) {
    const item = await this.prisma.voiceFeedback.findFirst({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException('Voice feedback not found');
    }
    return { feedbackId: item.id, status: 'done', transcript: item.transcript, analysis: item.analysis };
  }

  private async analyze(transcript: string, studentId?: string): Promise<unknown> {
    try {
      const config = getTaskConfig(SessionKind.FEEDBACK);
      const tools = toOpenAITools(AI_TOOL_DEFINITIONS.filter((tool) => config.tools.includes(tool.name)));
      const result = await this.ai.generate({
        task: SessionKind.FEEDBACK,
        messages: [
          {
            role: 'user',
            content: transcript,
          },
        ],
        tools,
        stream: false,
        studentId,
      });

      const raw = result.text.trim();
      const parsed = this.tryParseAnalysis(raw);
      return parsed;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Voice analysis failed' };
    }
  }

  private tryParseAnalysis(raw: string): unknown {
    const candidate = extractJsonObject(raw);
    if (candidate) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch {
        // fall through to summary
      }
    }
    return { summary: raw };
  }
}

function extractJsonObject(reply: string): string | null {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return reply.slice(start, end + 1);
}
