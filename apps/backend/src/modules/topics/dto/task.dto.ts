import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const TASK_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type TaskDifficulty = (typeof TASK_DIFFICULTIES)[number];

export class CreateTaskDto {
  @ApiProperty({ enum: TASK_DIFFICULTIES, example: 'medium' })
  @IsIn(TASK_DIFFICULTIES)
  difficulty: TaskDifficulty;

  @ApiProperty({ example: 'Решите: 2x + 3 = 9' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ example: 'manual', default: 'manual' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ enum: TASK_DIFFICULTIES, example: 'hard' })
  @IsOptional()
  @IsIn(TASK_DIFFICULTIES)
  difficulty?: TaskDifficulty;

  @ApiPropertyOptional({ example: 'Решите: 3x - 4 = 11' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
