import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class StudentGoalDto {
  @ApiProperty({ example: 'math' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  subject: string;

  @ApiProperty({ example: 'ЕНТ' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  target: string;

  @ApiPropertyOptional({ example: '2027-05-15' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(12)
  grade?: number;

  @ApiPropertyOptional({ type: [StudentGoalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentGoalDto)
  goals?: StudentGoalDto[];

  @ApiPropertyOptional({ example: { language: 'ru', explanationStyle: 'socratic' } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}

export class DiagnosticAnswerDto {
  @ApiProperty({ example: 'topic-id' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  topicId: string;

  @ApiProperty({ example: 'x = 2' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  correct: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  attemptNumber: number;
}

export class DiagnosticDto {
  @ApiProperty({ type: [DiagnosticAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticAnswerDto)
  answers: DiagnosticAnswerDto[];
}

export class StudentSubjectQueryDto {
  @ApiPropertyOptional({ example: 'subject-id', description: 'Limits knowledge or roadmap to one subject' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  subjectId?: string;
}
