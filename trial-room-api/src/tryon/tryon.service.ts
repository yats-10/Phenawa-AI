import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../entities/user.entity';
import { Fabric } from '../entities/fabric.entity';
import { Generation } from '../entities/generation.entity';
import { GeminiService } from './gemini.service';
import { GenerateDto } from './dto/generate.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TryonService {
  private readonly logger = new Logger(TryonService.name);

  constructor(
    @InjectRepository(Fabric)
    private readonly fabricRepository: Repository<Fabric>,
    @InjectRepository(Generation)
    private readonly generationRepository: Repository<Generation>,
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService,
  ) {}

  async generate(
    user: User,
    dto: GenerateDto,
  ): Promise<{ resultBase64: string; cached: boolean }> {
    if (!dto.fabricId && !dto.fabricImageBase64) {
      throw new BadRequestException(
        'Provide either fabricId or fabricImageBase64',
      );
    }

    // 1. Resolve fabric base64
    let fabricBase64: string;
    let resolvedFabricId: string | null = null;

    if (dto.fabricId) {
      const fabric = await this.fabricRepository.findOne({
        where: { id: dto.fabricId, userId: user.id },
      });
      if (!fabric) throw new NotFoundException('Fabric not found');
      fabricBase64 = fabric.imageBase64;
      resolvedFabricId = fabric.id;
    } else {
      // Strip data URI prefix if present
      fabricBase64 = dto.fabricImageBase64!.includes(',')
        ? dto.fabricImageBase64!.split(',')[1]!
        : dto.fabricImageBase64!;
    }

    // Strip data URI prefix from person image if present
    const personBase64 = dto.personImageBase64.includes(',')
      ? dto.personImageBase64.split(',')[1]!
      : dto.personImageBase64;

    // 2. Check cache (only when using catalogue fabric)
    if (resolvedFabricId) {
      const cached = await this.generationRepository.findOne({
        where: {
          userId: user.id,
          fabricId: resolvedFabricId,
          garmentType: dto.garmentType,
        },
        order: { createdAt: 'DESC' },
      });
      if (cached?.resultBase64) {
        return { resultBase64: cached.resultBase64, cached: true };
      }
    }

    // 3. Call Gemini with base64 directly
    const resultBase64 = await this.geminiService.generateTryon(
      personBase64,
      fabricBase64,
      dto.garmentType,
    );

    // 4. Save generation record (with result for cache)
    const generation = this.generationRepository.create({
      userId: user.id,
      fabricId: resolvedFabricId,
      garmentType: dto.garmentType,
      resultBase64: resolvedFabricId ? resultBase64 : null,
    });
    await this.generationRepository.save(generation);

    // 5. Check daily count and log warning if needed
    await this.checkDailyThreshold(user.id);

    return { resultBase64, cached: false };
  }

  async getTotalCount(userId: string): Promise<number> {
    return this.generationRepository.count({ where: { userId } });
  }

  private async checkDailyThreshold(userId: string): Promise<void> {
    const threshold = parseInt(
      this.configService.get<string>('MAX_DAILY_ALERT_THRESHOLD', '80'),
      10,
    );
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const count = await this.generationRepository.count({
      where: { userId, createdAt: MoreThanOrEqual(todayStart) },
    });

    if (count > threshold) {
      this.logger.warn(
        `User ${userId} has exceeded daily generation threshold: ${count} today`,
      );
    }
  }
}
