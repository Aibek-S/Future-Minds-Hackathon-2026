import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { FeedbackController } from './feedback.controller';

@Module({
  imports: [AuthModule, ChatModule],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
