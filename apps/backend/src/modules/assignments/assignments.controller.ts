import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, SubmitAssignmentDto, VerifyAssignmentDto } from './dto/assignment.dto';

type RequestWithUser = { user: { id: string; role: string } };

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('classes/:id/assignments')
  @Roles('TEACHER', 'ADMIN')
  create(@Param('id') classId: string, @Body() dto: CreateAssignmentDto, @Req() request: RequestWithUser) {
    return this.assignmentsService.create(classId, dto, request.user);
  }

  @Get('assignments/:id')
  @Roles('TEACHER', 'ADMIN')
  getById(@Param('id') assignmentId: string, @Req() request: RequestWithUser) {
    return this.assignmentsService.getById(assignmentId, request.user);
  }

  @Post('student-assignments/:id/submit')
  @Roles('STUDENT')
  submit(@Param('id') studentAssignmentId: string, @Body() dto: SubmitAssignmentDto, @Req() request: RequestWithUser) {
    return this.assignmentsService.submit(studentAssignmentId, dto, request.user);
  }

  @Post('student-assignments/:id/verify')
  @Roles('TEACHER', 'ADMIN')
  verify(@Param('id') studentAssignmentId: string, @Body() dto: VerifyAssignmentDto, @Req() request: RequestWithUser) {
    return this.assignmentsService.verify(studentAssignmentId, dto, request.user);
  }
}
