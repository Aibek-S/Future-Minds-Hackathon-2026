import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SessionKind } from '@prisma/client';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  protected readonly kind: SessionKind = SessionKind.STUDENT_CHAT;

  constructor(protected readonly chatService: ChatService) {}

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
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() request: { user: { id: string; role: string } },
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
