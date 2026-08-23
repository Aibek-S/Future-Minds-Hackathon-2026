import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  createSession(@Req() request: { user: { id: string; role: string } }) {
    return this.chatService.createSession(request.user);
  }

  @Get('sessions')
  listSessions(@Req() request: { user: { id: string; role: string } }) {
    return this.chatService.listSessions(request.user);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string, @Req() request: { user: { id: string; role: string } }) {
    return this.chatService.getSession(id, request.user);
  }

  /**
   * Sends a message and streams the assistant answer over SSE.
   * Events: `message` (text chunk), `toolCalls`, `done` (usage), `error`.
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

    try {
      const { stream } = await this.chatService.sendMessage(id, dto, request.user);

      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'text':
            assistantText += chunk.text;
            this.writeEvent(response, 'message', { text: chunk.text });
            break;
          case 'toolCalls':
            this.writeEvent(response, 'toolCalls', { toolCalls: chunk.toolCalls });
            break;
          case 'done':
            this.writeEvent(response, 'done', { usage: chunk.usage });
            break;
        }
      }

      await this.chatService.saveAssistantMessage(id, assistantText);
      response.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.writeEvent(response, 'error', { message });
      response.end();
    }
  }

  private writeEvent(response: Response, event: string, data: unknown) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
