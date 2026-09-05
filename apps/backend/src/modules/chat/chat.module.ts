import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { PersonalizationController } from './personalization.controller';
import { ChatService } from './chat.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [ChatController, PersonalizationController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
