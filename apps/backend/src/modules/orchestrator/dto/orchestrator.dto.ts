import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class OrchestratorQueryDto {
  @ApiProperty({ example: 'teacher-id' })
  @IsString()
  teacherId: string;

  @ApiProperty({ example: 'class-id' })
  @IsString()
  classId: string;

  @ApiProperty({ example: 'What should I cover in the next lesson?' })
  @IsString()
  @MinLength(3)
  question: string;
}

export class ApproveRecommendationDto {
  @ApiPropertyOptional({
    example: { date: '2026-09-10T09:00:00.000Z', planJson: { warmup: 'Short review' } },
  })
  @IsOptional()
  @IsObject()
  edits?: Record<string, unknown>;
}
