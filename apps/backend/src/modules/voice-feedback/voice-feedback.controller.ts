import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VoiceFeedbackService } from './voice-feedback.service';

@ApiTags('Voice Feedback')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('voice-feedback')
export class VoiceFeedbackController {
  constructor(private readonly service: VoiceFeedbackService) {}

  /**
   * Creates feedback from a transcript (STT is done client-side).
   * Analysis runs on the backend and is stored.
   */
  @Post()
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  create(
    @Req() req: { user: { id: string } },
    @Body() body: { transcript?: string },
  ) {
    return this.service.create(req.user.id, body.transcript ?? '');
  }

  @Get(':id')
  get(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.service.get(id, req.user.id);
  }
}
