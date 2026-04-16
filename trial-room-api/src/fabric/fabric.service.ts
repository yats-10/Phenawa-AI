import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fabric } from '../entities/fabric.entity';
import { User } from '../entities/user.entity';
import { CreateFabricDto } from './dto/create-fabric.dto';

@Injectable()
export class FabricService {
  constructor(
    @InjectRepository(Fabric)
    private readonly fabricRepository: Repository<Fabric>,
  ) {}

  async findAll(user: User): Promise<Fabric[]> {
    return this.fabricRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async create(user: User, dto: CreateFabricDto): Promise<Fabric> {
    // Strip data URI prefix if present, store pure base64
    const cleanBase64 = dto.imageBase64.includes(',')
      ? dto.imageBase64.split(',')[1]!
      : dto.imageBase64;

    const fabric = this.fabricRepository.create({
      userId: user.id,
      name: dto.name,
      imageBase64: cleanBase64,
    });
    return this.fabricRepository.save(fabric);
  }

  async remove(user: User, fabricId: string): Promise<void> {
    const fabric = await this.fabricRepository.findOne({
      where: { id: fabricId },
    });
    if (!fabric) throw new NotFoundException('Fabric not found');
    if (fabric.userId !== user.id) {
      throw new ForbiddenException('You do not own this fabric');
    }
    await this.fabricRepository.remove(fabric);
  }
}
