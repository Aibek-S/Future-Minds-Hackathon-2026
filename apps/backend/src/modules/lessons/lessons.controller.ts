import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateLessonDto, CreateLessonFeedbackDto, UpdateLessonDto } from './dto/lesson.dto';
import { LessonsService } from './lessons.service';

type RequestWithUser = { user: { id: string; role: string } };

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('classes/:id/lessons')
  @Roles('TEACHER', 'ADMIN')
  create(@Param('id') classId: string, @Body() dto: CreateLessonDto, @Req() request: RequestWithUser) {
    return this.lessonsService.create(classId, dto, request.user);
  }

  @Get('classes/:id/lessons')
  @Roles('TEACHER', 'ADMIN')
  list(
    @Param('id') classId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Req() request: RequestWithUser,
  ) {
    return this.lessonsService.listForClass(classId, from, to, request.user);
  }

  @Get('lessons/:id')
  @Roles('TEACHER', 'ADMIN')
  getById(@Param('id') lessonId: string, @Req() request: RequestWithUser) {
    return this.lessonsService.getById(lessonId, request.user);
  }

  @Put('lessons/:id')
  @Roles('TEACHER', 'ADMIN')
  update(@Param('id') lessonId: string, @Body() dto: UpdateLessonDto, @Req() request: RequestWithUser) {
    return this.lessonsService.update(lessonId, dto, request.user);
  }

  @Delete('lessons/:id')
  @Roles('TEACHER', 'ADMIN')
  delete(@Param('id') lessonId: string, @Req() request: RequestWithUser) {
    return this.lessonsService.delete(lessonId, request.user);
  }

  @Post('lessons/:id/feedback')
  @Roles('STUDENT')
  createFeedback(
    @Param('id') lessonId: string,
    @Body() dto: CreateLessonFeedbackDto,
    @Req() request: RequestWithUser,
  ) {
    return this.lessonsService.createFeedback(lessonId, dto, request.user);
  }

  @Get('lessons/:id/feedback')
  @Roles('TEACHER', 'ADMIN')
  getFeedback(@Param('id') lessonId: string, @Req() request: RequestWithUser) {
    return this.lessonsService.getFeedback(lessonId, request.user);
  }
}
