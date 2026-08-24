import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { DiagnosticController } from './diagnostic.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, ChatModule, RealtimeModule],
  controllers: [DiagnosticController],
})
export class DiagnosticModule {}
