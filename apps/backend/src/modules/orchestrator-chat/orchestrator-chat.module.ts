import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { OrchestratorChatController } from './orchestrator-chat.controller';

@Module({
  imports: [AuthModule, ChatModule],
  controllers: [OrchestratorChatController],
})
export class OrchestratorChatModule {}
