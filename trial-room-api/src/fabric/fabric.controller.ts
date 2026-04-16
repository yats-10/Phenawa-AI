import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FabricService } from './fabric.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { CreateFabricDto } from './dto/create-fabric.dto';

@Controller('fabrics')
@UseGuards(JwtAuthGuard)
export class FabricController {
  constructor(private readonly fabricService: FabricService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.fabricService.findAll(user);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateFabricDto,
  ) {
    return this.fabricService.create(user, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    await this.fabricService.remove(user, id);
    return { message: 'Fabric deleted' };
  }
}
