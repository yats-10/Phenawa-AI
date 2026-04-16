import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFabricDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  imageBase64!: string;
}
