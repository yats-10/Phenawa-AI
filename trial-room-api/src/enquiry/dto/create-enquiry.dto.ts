import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { EnquiryStatus } from '../../entities/enquiry.entity';

export class CreateEnquiryDto {
  @IsUUID()
  generationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @IsIn(['interested', 'ordered'])
  status!: EnquiryStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedPrice?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsBoolean()
  whatsappOptIn!: boolean;

  @IsBoolean()
  savePreview!: boolean;

  @IsOptional()
  @IsString()
  resultBase64?: string;
}
