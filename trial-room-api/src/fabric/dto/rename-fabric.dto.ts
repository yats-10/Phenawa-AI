import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RenameFabricDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
