import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';

export interface LoginResponse {
  accessToken: string;
  shopName: string;
  ownerName: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const adminPhone = this.configService.get<string>('ADMIN_PHONE', '');

    // Step 1: user exists
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Step 2: password matches
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Step 3: account active
    if (!user.isActive) {
      throw new ForbiddenException(
        `Account deactivated. Call ${adminPhone}`,
      );
    }

    // Step 4: access not expired
    if (user.accessExpiresAt < new Date()) {
      const expDate = user.accessExpiresAt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      throw new ForbiddenException(
        `Access expired on ${expDate}. Call ${adminPhone} to renew.`,
      );
    }

    const payload = {
      sub: user.id,
      username: user.username,
      shopName: user.shopName,
      accessExpiresAt: user.accessExpiresAt.toISOString(),
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      shopName: user.shopName,
      ownerName: user.ownerName,
    };
  }
}
