import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoiceFeedbackController } from './voice-feedback.controller';
import { VoiceFeedbackService } from './voice-feedback.service';

@Module({
  imports: [AuthModule],
  controllers: [VoiceFeedbackController],
  providers: [VoiceFeedbackService],
})
export class VoiceFeedbackModule {}
