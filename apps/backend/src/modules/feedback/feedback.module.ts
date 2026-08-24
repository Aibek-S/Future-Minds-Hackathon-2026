import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { FeedbackController } from './feedback.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, ChatModule, RealtimeModule],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
