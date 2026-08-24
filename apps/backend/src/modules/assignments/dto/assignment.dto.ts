import { AssignmentMode } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'topic-id' })
  @IsString()
  topicId: string;

  @ApiPropertyOptional({ example: 'lesson-id' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiProperty({ enum: AssignmentMode, example: AssignmentMode.ONLINE })
  @IsEnum(AssignmentMode)
  mode: AssignmentMode;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['student-id'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];

  @ApiPropertyOptional({ type: [String], example: ['task-id'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  @ApiPropertyOptional({ example: '2026-09-05T23:59:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class SubmittedAnswerDto {
  @ApiProperty({ example: 'task-id' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 'x = 3' })
  @IsString()
  answer: string;
}

export class SubmitAssignmentDto {
  @ApiPropertyOptional({ type: [SubmittedAnswerDto] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers?: SubmittedAnswerDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  submittedInClass?: boolean;
}

export class VerifyAssignmentDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ example: 'Нужно перерешать второе задание.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
