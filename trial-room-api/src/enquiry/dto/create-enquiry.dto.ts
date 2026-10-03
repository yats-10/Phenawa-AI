import {
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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

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

}
