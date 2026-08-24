import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { OrchestratorChatController } from './orchestrator-chat.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, ChatModule, RealtimeModule],
  controllers: [OrchestratorChatController],
})
export class OrchestratorChatModule {}
