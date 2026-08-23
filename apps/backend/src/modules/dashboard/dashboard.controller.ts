import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

type RequestWithUser = { user: { id: string; role: string } };

@ApiTags('Teacher dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('classes/:id/overview')
  @Roles('TEACHER', 'ADMIN')
  getOverview(@Param('id') classId: string, @Req() request: RequestWithUser) {
    return this.dashboardService.getOverview(classId, request.user);
  }

  @Get('classes/:id/heatmap')
  @Roles('TEACHER', 'ADMIN')
  getHeatmap(@Param('id') classId: string, @Req() request: RequestWithUser) {
    return this.dashboardService.getHeatmap(classId, request.user);
  }

  @Get('classes/:id/students')
  @Roles('TEACHER', 'ADMIN')
  getStudents(@Param('id') classId: string, @Req() request: RequestWithUser) {
    return this.dashboardService.getStudents(classId, request.user);
  }

  @Get('students/:id/profile')
  @Roles('TEACHER', 'ADMIN')
  getStudentProfile(@Param('id') studentId: string, @Req() request: RequestWithUser) {
    return this.dashboardService.getStudentProfile(studentId, request.user);
  }

  @Get('classes/:id/students/:sid/attempts')
  @Roles('TEACHER', 'ADMIN')
  getStudentAttempts(
    @Param('id') classId: string,
    @Param('sid') studentId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.dashboardService.getStudentAttempts(classId, studentId, request.user);
  }
}
