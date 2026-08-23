import { Controller, Delete, Get, Param, Post, Put, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TopicsService } from './topics.service';

@ApiTags('Tasks')
@Controller()
export class TasksController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get('topics/:id/tasks')
  list(@Param('id') topicId: string, @Query('difficulty') difficulty?: string) {
    return this.topicsService.listTasks(topicId, difficulty);
  }

  @Post('topics/:id/tasks')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  create(@Param('id') topicId: string, @Body() dto: CreateTaskDto) {
    return this.topicsService.createTask(topicId, dto);
  }

  @Put('tasks/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.topicsService.updateTask(id, dto);
  }

  @Delete('tasks/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  delete(@Param('id') id: string) {
    return this.topicsService.deleteTask(id);
  }
}
