import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionKind } from '@prisma/client';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RedisPubSubService } from '../realtime/redis-pubsub.service';

@ApiTags('Personalization')
@Controller('personalization')
export class PersonalizationController extends ChatController {
  protected readonly kind = SessionKind.PERSONALIZATION;

  constructor(chatService: ChatService, demoCache: RedisPubSubService) {
    super(chatService, demoCache);
  }
}
