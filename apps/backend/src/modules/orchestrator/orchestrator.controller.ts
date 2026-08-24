import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApproveRecommendationDto, OrchestratorQueryDto } from './dto/orchestrator.dto';
import { OrchestratorService } from './orchestrator.service';

type RequestWithUser = { user: { id: string; role: string } };

@ApiTags('AI Teacher Orchestrator')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('orchestrator/query')
  @Roles('TEACHER', 'ADMIN')
  query(@Body() dto: OrchestratorQueryDto, @Req() request: RequestWithUser) {
    return this.orchestratorService.query(dto, request.user);
  }

  @Get('recommendations')
  @Roles('TEACHER', 'ADMIN')
  list(@Query('classId') classId: string, @Query('status') status: string | undefined, @Req() request: RequestWithUser) {
    return this.orchestratorService.list(classId, status, request.user);
  }

  @Post('recommendations/:id/approve')
  @Roles('TEACHER', 'ADMIN')
  approve(@Param('id') recommendationId: string, @Body() dto: ApproveRecommendationDto, @Req() request: RequestWithUser) {
    return this.orchestratorService.approve(recommendationId, dto, request.user);
  }

  @Post('recommendations/:id/reject')
  @Roles('TEACHER', 'ADMIN')
  reject(@Param('id') recommendationId: string, @Req() request: RequestWithUser) {
    return this.orchestratorService.reject(recommendationId, request.user);
  }
}
