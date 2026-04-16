import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { LoginDto } from '../auth/dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.adminService.adminLogin(dto);
  }

  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  async seed(
    @Body() dto: LoginDto,
    @Headers('x-seed-secret') seedSecret: string,
  ) {
    return this.adminService.seedAdmin(dto, seedSecret ?? '');
  }

  @Post('users')
  @UseGuards(AdminJwtGuard)
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users')
  @UseGuards(AdminJwtGuard)
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id')
  @UseGuards(AdminJwtGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('users/:id/stats')
  @UseGuards(AdminJwtGuard)
  async getUserStats(@Param('id') id: string) {
    return this.adminService.getUserStats(id);
  }
}
