import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiToolsService } from '../../ai/tools/ai-tools.service';
import { SearchMaterialsDto } from './dto/topic.dto';

@ApiTags('Materials')
@Controller('materials')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MaterialsController {
  constructor(private readonly aiTools: AiToolsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Semantic search in vectorized course materials' })
  search(@Query() dto: SearchMaterialsDto) {
    return this.aiTools.searchMaterials(dto);
  }
}
