import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionKind } from '@prisma/client';
import { ChatController } from '../chat/chat.controller';
import { ChatService } from '../chat/chat.service';

@ApiTags('Orchestrator Chat')
@Controller('orchestrator/chat')
export class OrchestratorChatController extends ChatController {
  protected readonly kind = SessionKind.ORCHESTRATOR;

  constructor(chatService: ChatService) {
    super(chatService);
  }
}
