import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAttemptDto {
  @ApiProperty({ example: 'student-id' })
  @IsString()
  studentId: string;

  @ApiProperty({ example: 'correct', description: 'Mock accepts correct or правильно as a correct answer' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer: string;
}
