import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ example: '10A' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 10, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;
}

export class JoinClassDto {
  @ApiProperty({ example: '7XKQ2M9B' })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code: string;
}
