import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { TryonService } from './tryon.service';
import { GenerateDto } from './dto/generate.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('tryon')
@UseGuards(JwtAuthGuard)
export class TryonController {
  constructor(private readonly tryonService: TryonService) {}

  @Get('count')
  async getCount(
    @CurrentUser() user: User,
  ): Promise<{ total: number }> {
    const total = await this.tryonService.getTotalCount(user.id);
    return { total };
  }

  @Post('generate')
  async generate(
    @CurrentUser() user: User,
    @Body() dto: GenerateDto,
  ): Promise<{ resultBase64: string }> {
    return this.tryonService.generate(user, dto);
  }
}
