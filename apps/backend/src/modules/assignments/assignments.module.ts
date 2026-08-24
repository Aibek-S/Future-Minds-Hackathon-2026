import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnswerCheckerService } from '../attempts/answer-checker.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AnswerCheckerService, RolesGuard],
})
export class AssignmentsModule {}
