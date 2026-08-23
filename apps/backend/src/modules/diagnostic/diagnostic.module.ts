import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { DiagnosticController } from './diagnostic.controller';

@Module({
  imports: [AuthModule, ChatModule],
  controllers: [DiagnosticController],
})
export class DiagnosticModule {}
