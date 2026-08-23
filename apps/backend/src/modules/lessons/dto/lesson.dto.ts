import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ example: '2026-09-01T09:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'topic-id' })
  @IsString()
  topicId: string;

  @ApiProperty({
    example: {
      objectives: ['Solve linear equations'],
      warmup: 'Five-minute review',
      explanation: 'Explain the balance method',
      practice: ['Solve 2x + 4 = 10'],
      differentiatedTasks: { weak: ['Use a worked example'], strong: ['Solve a word problem'] },
      assessment: 'Exit ticket',
      homework: 'Exercises 1-5',
    },
  })
  @IsObject()
  planJson: Record<string, unknown>;
}

export class UpdateLessonDto {
  @ApiPropertyOptional({ example: '2026-09-01T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'topic-id' })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  planJson?: Record<string, unknown>;
}

export class CreateLessonFeedbackDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'The practice task was helpful.' })
  @IsOptional()
  @IsString()
  commentOrAudioUrl?: string;
}
