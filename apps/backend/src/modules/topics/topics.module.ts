import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TasksController } from './tasks.controller';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [AuthModule, PassportModule, AiModule],
  controllers: [TopicsController, TasksController],
  providers: [TopicsService, RolesGuard],
})
export class TopicsModule {}
