import { Controller, Delete, Get, Param, Post, Put, Body, Query, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @ApiBearerAuth()
  addMaterial(@Param('id') id: string, @Body() dto: CreateMaterialDto, @UploadedFile() file?: Express.Multer.File) {
    const content = dto.content ?? file?.buffer?.toString('utf8');
    if (!content?.trim()) throw new BadRequestException('content or a UTF-8 text file is required');
    return this.topicsService.addMaterial(id, { ...dto, content, sourceUrl: dto.sourceUrl ?? (file ? file.originalname : undefined) });
  }

  @Get(':id/materials/:materialId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  getMaterialStatus(@Param('id') id: string, @Param('materialId') materialId: string) {
    return this.topicsService.getMaterialStatus(id, materialId);
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
