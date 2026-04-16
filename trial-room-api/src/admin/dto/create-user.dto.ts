import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsPhoneNumber,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username must be lowercase letters, numbers, and underscores only',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  shop_name!: string;

  @IsString()
  @IsNotEmpty()
  owner_name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsDateString()
  access_expires_at!: string;
}
