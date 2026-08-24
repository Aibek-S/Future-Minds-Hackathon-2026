import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SessionKind } from '@prisma/client';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RedisPubSubService } from '../realtime/redis-pubsub.service';
import { createHash } from 'crypto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  protected readonly kind: SessionKind = SessionKind.STUDENT_CHAT;

  constructor(protected readonly chatService: ChatService, private readonly demoCache: RedisPubSubService) {}

  @Post('sessions')
  createSession(@Req() request: { user: { id: string; role: string } }) {
    return this.chatService.createSession(request.user, this.kind);
  }

  @Get('sessions')
  listSessions(@Req() request: { user: { id: string; role: string } }) {
    return this.chatService.listSessions(request.user, this.kind);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string, @Req() request: { user: { id: string; role: string } }) {
    return this.chatService.getSession(id, request.user, this.kind);
  }

  /**
   * Sends a message and streams the assistant answer over SSE.
   * Events: `message` (text chunk), `widget`, `done` (usage), `error`.
   */
  @Post('sessions/:id/messages')
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() request: { user: { id: string; role: string }; headers: Record<string, string | undefined> },
    @Res() response: Response,
  ) {
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    let assistantText = '';
    const widgets: unknown[] = [];

    try {
      const cacheKey = request.headers['x-demo-user']
        ? `demo:chat:${createHash('sha256').update(`${id}:${dto.content}`).digest('hex')}`
        : null;
      if (cacheKey) await this.chatService.getSession(id, request.user, this.kind);
      const cached = cacheKey ? await this.demoCache.getCache(cacheKey) : null;
      if (cached) {
        const value = JSON.parse(cached) as { content: string; widget?: unknown };
        await new Promise((resolve) => setTimeout(resolve, 350));
        await this.chatService.saveStudentMessage(id, dto.content);
        await this.chatService.saveAssistantMessage(id, value.content, value.widget);
        this.writeEvent(response, 'message', { text: value.content });
        if (value.widget) this.writeEvent(response, 'widget', { widget: value.widget });
        this.writeEvent(response, 'done', { usage: { provider: 'demo-cache' } });
        response.end();
        return;
      }
      const { stream } = await this.chatService.sendMessage(id, dto, request.user, this.kind);

      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'text':
            assistantText += chunk.text;
            this.writeEvent(response, 'message', { text: chunk.text });
            break;
          case 'widget':
            widgets.push(chunk.widget);
            this.writeEvent(response, 'widget', { widget: chunk.widget });
            break;
          case 'done':
            this.writeEvent(response, 'done', { usage: chunk.usage });
            break;
        }
      }

      await this.chatService.saveAssistantMessage(id, assistantText, widgets[widgets.length - 1]);
      if (cacheKey) await this.demoCache.setCache(cacheKey, JSON.stringify({ content: assistantText, widget: widgets[widgets.length - 1] }));
      response.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.writeEvent(response, 'error', { message });
      response.end();
    }
  }

  protected writeEvent(response: Response, event: string, data: unknown) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
