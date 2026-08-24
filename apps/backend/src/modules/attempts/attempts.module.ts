import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { AnswerCheckerService } from './answer-checker.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, AnswerCheckerService],
})
export class AttemptsModule {}
