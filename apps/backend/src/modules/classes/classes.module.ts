import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [AuthModule],
  controllers: [ClassesController],
  providers: [ClassesService, RolesGuard],
})
export class ClassesModule {}
