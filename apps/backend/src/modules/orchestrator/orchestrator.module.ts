import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../../ai/ai.module';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, RolesGuard],
})
export class OrchestratorModule {}
