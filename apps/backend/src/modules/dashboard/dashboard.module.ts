import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, RolesGuard],
})
export class DashboardModule {}
