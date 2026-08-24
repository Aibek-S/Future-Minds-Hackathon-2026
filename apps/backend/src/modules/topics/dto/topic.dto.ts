import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateMaterialDto {
  @IsString() @MinLength(1) @MaxLength(100000) content: string;
  @IsOptional() @IsUrl() sourceUrl?: string;
}

export class CreateTopicDto {
  @ApiProperty({ example: 'Тригонометрия' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'subject-id' })
  @IsString()
  subjectId: string;

  @ApiPropertyOptional({ example: 'parent-topic-id', nullable: true })
  @IsOptional()
  @IsString()
  parentTopicId?: string | null;

  @ApiPropertyOptional({ example: ['topic-id'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];
}

export class UpdateTopicDto {
  @ApiPropertyOptional({ example: 'Тригонометрия' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'parent-topic-id', nullable: true })
  @IsOptional()
  @IsString()
  parentTopicId?: string | null;

  @ApiPropertyOptional({ example: ['topic-id'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];
}
