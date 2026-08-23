import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { SendMessageDto } from './dto/send-message.dto';

type Requester = { id: string; role: string };

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async createSession(requester: Requester) {
    const student = requester.role === 'STUDENT'
      ? await this.prisma.student.findUnique({ where: { userId: requester.id }, select: { id: true } })
      : null;

    const session = await this.prisma.tutorSession.create({
      data: {
        userId: requester.id,
        studentId: student?.id ?? null,
      },
    });
    return { sessionId: session.id, createdAt: session.createdAt };
  }

  async listSessions(requester: Requester) {
    const sessions = await this.prisma.tutorSession.findMany({
      where: { userId: requester.id },
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

  async getSession(id: string, requester: Requester) {
    const session = await this.assertSessionAccess(id, requester);
    const messages = await this.prisma.tutorMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true, widget: true, createdAt: true },
    });
    return { sessionId: session.id, messages };
  }

  async sendMessage(id: string, dto: SendMessageDto, requester: Requester) {
    const session = await this.assertSessionAccess(id, requester);

    await this.prisma.tutorMessage.create({
      data: { sessionId: id, role: 'user', content: dto.content },
    });

    const history = await this.prisma.tutorMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    const messages: ChatCompletionMessageParam[] = history.map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }));

    const stream = await this.ai.generateStream({
      task: 'chat',
      messages,
      stream: true,
    });

    return { sessionId: session.id, stream };
  }

  async saveAssistantMessage(sessionId: string, content: string) {
    await this.prisma.tutorMessage.create({
      data: { sessionId, role: 'assistant', content },
    });
  }

  private async assertSessionAccess(id: string, requester: Requester) {
    const session = await this.prisma.tutorSession.findUnique({ where: { id } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId !== requester.id && requester.role !== 'ADMIN') {
      throw new ForbiddenException('You can access only your own chat sessions');
    }
    return session;
  }
}
