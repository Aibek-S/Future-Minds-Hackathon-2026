import { Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { VoiceFeedbackService } from './voice-feedback.service';

@Controller('voice-feedback') @UseGuards(AuthGuard('jwt'))
export class VoiceFeedbackController {
  constructor(private readonly service: VoiceFeedbackService) {}
  @Post() @Throttle({ default: { limit: 5, ttl: 3600000 } }) @UseInterceptors(FileInterceptor('audio'))
  create(@Req() req: { user: { id: string } }, @UploadedFile() file: Express.Multer.File) { return this.service.create(req.user.id, file); }
  @Get(':id') get(@Req() req: { user: { id: string } }, @Param('id') id: string) { return this.service.get(id, req.user.id); }
}
