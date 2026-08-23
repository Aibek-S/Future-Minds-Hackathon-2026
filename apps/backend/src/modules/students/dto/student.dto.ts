import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ example: [{ subject: 'math', target: 'ЕНТ' }] })
  @IsOptional()
  @IsArray()
  goals?: unknown[];

  @ApiPropertyOptional({ example: { language: 'ru', explanationStyle: 'socratic' } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

export class DiagnosticAnswerDto {
  @ApiPropertyOptional({ example: 'topic-id' })
  topicId: string;

  @ApiPropertyOptional({ example: 'x = 2' })
  answer: string;

  @ApiPropertyOptional({ example: true })
  correct: boolean;

  @ApiPropertyOptional({ example: 1 })
  attemptNumber?: number;
}

export class DiagnosticDto {
  @ApiPropertyOptional({ type: [DiagnosticAnswerDto] })
  @IsArray()
  answers: DiagnosticAnswerDto[];
}
