import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DiagnosticDto, StudentSubjectQueryDto, UpdateStudentDto } from './dto/student.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get(':id')
  getProfile(@Param('id') id: string, @Req() request: { user: { id: string; role: string } }) {
    return this.studentsService.getProfile(id, request.user);
  }

  @Put(':id')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @Req() request: { user: { id: string; role: string } },
  ) {
    return this.studentsService.updateProfile(id, dto, request.user);
  }

  @Get(':id/knowledge')
  getKnowledge(
    @Param('id') id: string,
    @Query() query: StudentSubjectQueryDto,
    @Req() request: { user: { id: string; role: string } },
  ) {
    return this.studentsService.getKnowledge(id, request.user, query.subjectId);
  }

  @Get(':id/subjects')
  getSubjectSummary(
    @Param('id') id: string,
    @Req() request: { user: { id: string; role: string } },
  ) {
    return this.studentsService.getSubjectSummary(id, request.user);
  }

  @Get(':id/roadmap')
  getRoadmap(
    @Param('id') id: string,
    @Query() query: StudentSubjectQueryDto,
    @Req() request: { user: { id: string; role: string } },
  ) {
    return this.studentsService.getRoadmap(id, request.user, query.subjectId);
  }

  @Post(':id/diagnostic')
  runDiagnostic(
    @Param('id') id: string,
    @Body() dto: DiagnosticDto,
    @Req() request: { user: { id: string; role: string } },
  ) {
    return this.studentsService.runDiagnostic(id, dto, request.user);
  }
}
