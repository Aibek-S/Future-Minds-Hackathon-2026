import { IsEmail, IsEnum, IsInt, IsOptional, IsPhoneNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateAdminUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsInt() @Min(1) @Max(12) grade?: number;
  @IsOptional() @IsPhoneNumber() phone?: string;
}

export class UpdateAdminUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsPhoneNumber() phone?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
}
