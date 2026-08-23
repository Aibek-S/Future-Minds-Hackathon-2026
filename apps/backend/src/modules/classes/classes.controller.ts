import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClassesService } from './classes.service';
import { CreateClassDto, JoinClassDto } from './dto/class.dto';

type RequestWithUser = { user: { id: string; role: string } };

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post('teachers/:id/classes')
  @Roles('TEACHER', 'ADMIN')
  create(
    @Param('id') teacherId: string,
    @Body() dto: CreateClassDto,
    @Req() request: RequestWithUser,
  ) {
    return this.classesService.create(teacherId, dto, request.user);
  }

  @Get('teachers/:id/classes')
  @Roles('TEACHER', 'ADMIN')
  listForTeacher(@Param('id') teacherId: string, @Req() request: RequestWithUser) {
    return this.classesService.listForTeacher(teacherId, request.user);
  }

  @Post('classes/:id/join')
  @Roles('STUDENT')
  join(@Param('id') classId: string, @Body() dto: JoinClassDto, @Req() request: RequestWithUser) {
    return this.classesService.join(classId, dto.code, request.user);
  }

  @Delete('classes/:id/students/:sid')
  @Roles('TEACHER', 'ADMIN')
  removeStudent(
    @Param('id') classId: string,
    @Param('sid') studentId: string,
    @Req() request: RequestWithUser,
  ) {
    return this.classesService.removeStudent(classId, studentId, request.user);
  }

  @Delete('classes/:id')
  @Roles('TEACHER', 'ADMIN')
  delete(@Param('id') classId: string, @Req() request: RequestWithUser) {
    return this.classesService.delete(classId, request.user);
  }
}
