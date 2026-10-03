import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';
import { EnquiryService } from './enquiry.service';

@Controller('enquiries')
@UseGuards(JwtAuthGuard)
export class EnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateEnquiryDto) {
    return this.enquiryService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query('status') status?: string) {
    return this.enquiryService.findAll(user.id, status);
  }

  @Get('popular-fabrics')
  popularFabrics(@CurrentUser() user: User) {
    return this.enquiryService.popularFabrics(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.enquiryService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnquiryDto,
  ) {
    return this.enquiryService.update(user.id, id, dto);
  }
}
