import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Run passport-jwt validation first
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    const request = context.switchToHttp().getRequest<{ user: { sub: string } }>();
    const jwtPayload = request.user;

    // Re-fetch user from DB to catch mid-session deactivations
    const user = await this.userRepository.findOne({
      where: { id: jwtPayload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const adminPhone = this.configService.get<string>('ADMIN_PHONE', '');

    if (!user.isActive) {
      throw new ForbiddenException(
        `Account deactivated. Call ${adminPhone}`,
      );
    }

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

    // Attach full user to request for use in controllers
    (request as Record<string, unknown>)['fullUser'] = user;
    return true;
  }

  handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return user;
  }
}
