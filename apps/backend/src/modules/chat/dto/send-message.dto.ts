import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Объясни, как решать квадратные уравнения' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}
