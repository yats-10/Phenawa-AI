import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan, Between } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entities/admin.entity';
import { User } from '../entities/user.entity';
import { Generation } from '../entities/generation.entity';
import { Fabric } from '../entities/fabric.entity';
import { LoginDto } from '../auth/dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Generation)
    private readonly generationRepository: Repository<Generation>,
    @InjectRepository(Fabric)
    private readonly fabricRepository: Repository<Fabric>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async adminLogin(dto: LoginDto): Promise<{ accessToken: string }> {
    const admin = await this.adminRepository.findOne({
      where: { username: dto.username },
    });
    if (!admin) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const payload = { sub: admin.id, username: admin.username, isAdmin: true };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }

  async seedAdmin(
    dto: LoginDto,
    seedSecret: string,
  ): Promise<{ message: string }> {
    const expectedSecret = this.configService.getOrThrow<string>(
      'ADMIN_SEED_SECRET',
    );
    if (seedSecret !== expectedSecret) {
      throw new ForbiddenException('Invalid seed secret');
    }
    const count = await this.adminRepository.count();
    if (count > 0) {
      throw new BadRequestException('Admin account already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.adminRepository.save(
      this.adminRepository.create({
        username: dto.username,
        passwordHash,
      }),
    );
    return { message: 'Admin account created' };
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      username: dto.username,
      passwordHash,
      shopName: dto.shop_name,
      ownerName: dto.owner_name,
      phone: dto.phone,
      accessExpiresAt: new Date(dto.access_expires_at),
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  async getAllUsers(): Promise<unknown[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return Promise.all(
      users.map(async (user) => {
        const [totalGenerations, generationsToday, fabricsCount, lastGen] =
          await Promise.all([
            this.generationRepository.count({ where: { userId: user.id } }),
            this.generationRepository.count({
              where: {
                userId: user.id,
                createdAt: MoreThanOrEqual(todayStart),
              },
            }),
            this.fabricRepository.count({ where: { userId: user.id } }),
            this.generationRepository.findOne({
              where: { userId: user.id },
              order: { createdAt: 'DESC' },
            }),
          ]);

        return {
          id: user.id,
          username: user.username,
          shop_name: user.shopName,
          owner_name: user.ownerName,
          phone: user.phone,
          is_active: user.isActive,
          access_expires_at: user.accessExpiresAt,
          created_at: user.createdAt,
          total_generations: totalGenerations,
          generations_today: generationsToday,
          fabrics_count: fabricsCount,
          last_active: lastGen?.createdAt ?? null,
        };
      }),
    );
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.is_active !== undefined) user.isActive = dto.is_active;
    if (dto.access_expires_at) {
      user.accessExpiresAt = new Date(dto.access_expires_at);
    }
    if (dto.shop_name) user.shopName = dto.shop_name;
    if (dto.owner_name) user.ownerName = dto.owner_name;
    if (dto.phone) user.phone = dto.phone;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    return this.userRepository.save(user);
  }

  async getUserStats(id: string): Promise<unknown> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalGenerations,
      generationsToday,
      generationsMonth,
      fabricsCount,
      lastGen,
    ] = await Promise.all([
      this.generationRepository.count({ where: { userId: id } }),
      this.generationRepository.count({
        where: { userId: id, createdAt: MoreThanOrEqual(todayStart) },
      }),
      this.generationRepository.count({
        where: { userId: id, createdAt: MoreThanOrEqual(monthStart) },
      }),
      this.fabricRepository.count({ where: { userId: id } }),
      this.generationRepository.findOne({
        where: { userId: id },
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Top garment types
    const garmentRows = (await this.generationRepository
      .createQueryBuilder('g')
      .select('g.garment_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('g.user_id = :id', { id })
      .groupBy('g.garment_type')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany()) as Array<{ type: string; count: string }>;

    return {
      total_generations: totalGenerations,
      generations_this_month: generationsMonth,
      generations_today: generationsToday,
      fabrics_count: fabricsCount,
      last_active: lastGen?.createdAt ?? null,
      top_garment_types: garmentRows.map((r) => ({
        type: r.type,
        count: parseInt(r.count, 10),
      })),
    };
  }
}
