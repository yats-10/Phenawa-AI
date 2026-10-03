import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { EnquiryStatus } from '../../entities/enquiry.entity';

export class UpdateEnquiryDto {
  @IsOptional()
  @IsIn(['interested', 'ordered'])
  status?: EnquiryStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedPrice?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
