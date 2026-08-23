import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAttemptDto } from './dto/attempt.dto';
import { AttemptsService } from './attempts.service';

@ApiTags('Attempts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post(':id/attempts')
  create(
    @Param('id') taskId: string,
    @Body() dto: CreateAttemptDto,
    @Req() request: { user: { id: string; role: string } },
  ) {
    return this.attemptsService.create(taskId, dto.studentId, dto, request.user);
  }
}
