import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../entities/customer.entity';
import { Enquiry } from '../entities/enquiry.entity';
import { Fabric } from '../entities/fabric.entity';
import { Generation } from '../entities/generation.entity';
import { User } from '../entities/user.entity';
import { EnquiryController } from './enquiry.controller';
import { EnquiryService } from './enquiry.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Enquiry, Fabric, Generation, User])],
  controllers: [EnquiryController],
  providers: [EnquiryService],
})
export class EnquiryModule {}
