import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionKind } from '@prisma/client';
import { ChatController } from '../chat/chat.controller';
import { ChatService } from '../chat/chat.service';
import { RedisPubSubService } from '../realtime/redis-pubsub.service';

@ApiTags('Diagnostic')
@Controller('diagnostic')
export class DiagnosticController extends ChatController {
  protected readonly kind = SessionKind.DIAGNOSTIC;

  constructor(chatService: ChatService, demoCache: RedisPubSubService) {
    super(chatService, demoCache);
  }
}
