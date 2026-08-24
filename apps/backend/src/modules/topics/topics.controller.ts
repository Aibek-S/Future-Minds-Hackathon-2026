import { Controller, Delete, Get, Param, Post, Put, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateMaterialDto, CreateTopicDto, UpdateTopicDto } from './dto/topic.dto';
import { TopicsService } from './topics.service';

@ApiTags('Topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({ summary: 'List topics' })
  list(@Query('subjectId') subjectId?: string) {
    return this.topicsService.listTopics(subjectId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  create(@Body() dto: CreateTopicDto) {
    return this.topicsService.createTopic(dto);
  }

  @Post(':id/materials')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  addMaterial(@Param('id') id: string, @Body() dto: CreateMaterialDto) {
    return this.topicsService.addMaterial(id, dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.topicsService.updateTopic(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  delete(@Param('id') id: string) {
    return this.topicsService.deleteTopic(id);
  }
}
