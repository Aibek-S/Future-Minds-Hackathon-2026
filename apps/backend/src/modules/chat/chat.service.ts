import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SessionKind } from '@prisma/client';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { AI_TOOL_DEFINITIONS, toOpenAITools } from '../../ai/tools/ai-tools.registry';
import { getTaskConfig, isStudentKind } from '../../ai/tasks';
import { ConfigService } from '@nestjs/config';
import { AI_ENV, DEFAULTS } from '../../ai/ai.constants';
import { SendMessageDto } from './dto/send-message.dto';

type Requester = { id: string; role: string };

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly config: ConfigService,
  ) {}

  async createSession(requester: Requester, kind: SessionKind) {
    this.assertRoleForKind(kind, requester);
    const student = requester.role === 'STUDENT'
      ? await this.prisma.student.findUnique({ where: { userId: requester.id }, select: { id: true } })
      : null;

    const session = await this.prisma.tutorSession.create({
      data: {
        kind,
        userId: requester.id,
        studentId: student?.id ?? null,
      },
    });
    return { sessionId: session.id, kind, createdAt: session.createdAt };
  }

  async listSessions(requester: Requester, kind: SessionKind) {
    this.assertRoleForKind(kind, requester);
    const sessions = await this.prisma.tutorSession.findMany({
      where: { userId: requester.id, kind },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, _count: { select: { messages: true } } },
    });
    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        messageCount: session._count.messages,
      })),
    };
  }

  async getSession(id: string, requester: Requester, kind: SessionKind) {
    const session = await this.assertSessionAccess(id, requester, kind);
    const messages = await this.prisma.tutorMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, widget: true, createdAt: true },
    });
    return {
      sessionId: session.id,
      kind: session.kind,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        widget: message.widget ?? undefined,
        createdAt: message.createdAt,
      })),
    };
  }

  async sendMessage(id: string, dto: SendMessageDto, requester: Requester, kind: SessionKind) {
    const session = await this.assertSessionAccess(id, requester, kind);
    this.assertRoleForKind(kind, requester);

    await this.prisma.tutorMessage.create({
      data: { sessionId: id, role: 'user', content: dto.content },
    });

    const history = await this.prisma.tutorMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, widget: true },
    });

    const messages: ChatCompletionMessageParam[] = history.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }));

    const config = getTaskConfig(kind);
    const tools = toOpenAITools(AI_TOOL_DEFINITIONS.filter((tool) => config.tools.includes(tool.name)));
    const widgetLimit = this.widgetLimit(kind);

    const stream = await this.ai.generateStream({
      task: kind,
      messages,
      tools,
      stream: true,
      studentId: session.studentId ?? undefined,
      classId: kind === SessionKind.ORCHESTRATOR ? dto.classId : undefined,
      widgetLimit,
    });

    return { sessionId: session.id, stream };
  }

  async saveStudentMessage(sessionId: string, content: string) {
    await this.prisma.tutorMessage.create({ data: { sessionId, role: 'user', content } });
  }

  async saveAssistantMessage(sessionId: string, content: string, widget?: unknown) {
    await this.prisma.tutorMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content,
        ...(widget ? { widget: widget as never } : {}),
      },
    });
  }

  private assertRoleForKind(kind: SessionKind, requester: Requester) {
    if (kind === SessionKind.ORCHESTRATOR) {
      if (requester.role !== 'TEACHER' && requester.role !== 'ADMIN') {
        throw new ForbiddenException('Orchestrator is available for teachers only');
      }
      return;
    }
    if (requester.role !== 'STUDENT') {
      throw new ForbiddenException('Student chats are available for students only');
    }
  }

  private async assertSessionAccess(id: string, requester: Requester, kind: SessionKind) {
    const session = await this.prisma.tutorSession.findUnique({ where: { id } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.kind !== kind) {
      throw new NotFoundException('Session not found for this chat type');
    }
    if (session.userId !== requester.id && requester.role !== 'ADMIN') {
      throw new ForbiddenException('You can access only your own sessions');
    }
    return session;
  }

  private widgetLimit(kind: SessionKind): number {
    const value = this.config.get<string>(AI_ENV.maxWidgets);
    const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return getTaskConfig(kind).widgetLimit ?? DEFAULTS.maxWidgets;
  }
}
