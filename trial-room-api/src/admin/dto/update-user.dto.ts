import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsDateString()
  access_expires_at?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shop_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  owner_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
