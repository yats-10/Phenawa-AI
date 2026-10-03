import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Fabric } from '../entities/fabric.entity';
import { Enquiry } from '../entities/enquiry.entity';
import { User } from '../entities/user.entity';
import { CreateFabricDto } from './dto/create-fabric.dto';

@Injectable()
export class FabricService {
  constructor(
    @InjectRepository(Fabric)
    private readonly fabricRepository: Repository<Fabric>,
    @InjectRepository(Enquiry)
    private readonly enquiryRepository: Repository<Enquiry>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(user: User): Promise<(Fabric & { interestedCount: number; orderedCount: number })[]> {
    const [fabrics, counts] = await Promise.all([
      this.fabricRepository.find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      }),
      this.enquiryRepository.createQueryBuilder('enquiry')
        .select('enquiry.fabricId', 'fabricId')
        .addSelect("COUNT(DISTINCT CASE WHEN enquiry.status = 'interested' THEN enquiry.customerId END)", 'interestedCount')
        .addSelect("COUNT(DISTINCT CASE WHEN enquiry.status = 'ordered' THEN enquiry.customerId END)", 'orderedCount')
        .where('enquiry.userId = :userId', { userId: user.id })
        .andWhere('enquiry.fabricId IS NOT NULL')
        .groupBy('enquiry.fabricId')
        .getRawMany<{ fabricId: string; interestedCount: string; orderedCount: string }>(),
    ]);
    const byFabric = new Map(counts.map((row) => [row.fabricId, row]));
    return fabrics.map((fabric) => ({
      ...fabric,
      interestedCount: Number(byFabric.get(fabric.id)?.interestedCount ?? 0),
      orderedCount: Number(byFabric.get(fabric.id)?.orderedCount ?? 0),
    }));
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

  async rename(user: User, fabricId: string, nameInput: string): Promise<Fabric> {
    const name = nameInput?.trim();
    if (!name) throw new BadRequestException('Fabric name is required');
    return this.dataSource.transaction(async (manager) => {
      const fabric = await manager.findOne(Fabric, {
        where: { id: fabricId, userId: user.id },
      });
      if (!fabric) throw new NotFoundException('Fabric not found');
      fabric.name = name;
      await manager.save(Fabric, fabric);
      await manager.update(Enquiry, { userId: user.id, fabricId }, { fabricName: name });
      return fabric;
    });
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
