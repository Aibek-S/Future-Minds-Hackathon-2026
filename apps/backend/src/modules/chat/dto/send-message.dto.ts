import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Объясни, как решать квадратные уравнения' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({ example: 'class-id', description: 'Required for orchestrator chat (teacher).' })
  @IsOptional()
  @IsString()
  classId?: string;
}
