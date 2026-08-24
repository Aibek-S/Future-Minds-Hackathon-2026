import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { VoiceFeedbackController } from './voice-feedback.controller';
import { VoiceFeedbackService } from './voice-feedback.service';
@Module({ imports: [AuthModule, RealtimeModule], controllers: [VoiceFeedbackController], providers: [VoiceFeedbackService] }) export class VoiceFeedbackModule {}
