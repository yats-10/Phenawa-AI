import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { EnquiryService } from './enquiry.service';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly enquiries: EnquiryService) {}

  @Get('lookup')
  lookup(@CurrentUser() user: User, @Query('phone') phone: string) {
    return this.enquiries.lookupCustomer(user.id, phone ?? '');
  }
}
