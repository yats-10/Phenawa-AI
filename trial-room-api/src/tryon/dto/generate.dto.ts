import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  personImageBase64!: string;

  @IsOptional()
  @IsString()
  fabricImageBase64?: string;

  @IsOptional()
  @IsUUID()
  fabricId?: string;

  @IsString()
  @IsNotEmpty()
  garmentType!: string;
}
