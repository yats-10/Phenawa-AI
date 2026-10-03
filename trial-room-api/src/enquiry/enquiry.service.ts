import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { Enquiry, EnquiryStatus } from '../entities/enquiry.entity';
import { Fabric } from '../entities/fabric.entity';
import { Generation } from '../entities/generation.entity';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';

function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12
    ? digits.slice(2)
    : digits.startsWith('0') && digits.length === 11
      ? digits.slice(1)
      : digits;
  if (!/^[6-9]\d{9}$/.test(local)) {
    throw new BadRequestException('Enter a valid 10-digit Indian mobile number.');
  }
  return `91${local}`;
}

function summary(enquiry: Enquiry) {
  return {
    id: enquiry.id,
    customerId: enquiry.customerId,
    customerName: enquiry.customer.name,
    customerPhone: enquiry.customer.phone,
    whatsappOptIn: enquiry.customer.whatsappOptIn,
    fabricId: enquiry.fabricId,
    fabricName: enquiry.fabricName,
    garmentType: enquiry.garmentType,
    status: enquiry.status,
    estimatedPrice: enquiry.estimatedPrice,
    notes: enquiry.notes,
    createdAt: enquiry.createdAt,
    updatedAt: enquiry.updatedAt,
  };
}

@Injectable()
export class EnquiryService {
  constructor(
    @InjectRepository(Enquiry)
    private readonly enquiries: Repository<Enquiry>,
    @InjectRepository(Fabric)
    private readonly fabrics: Repository<Fabric>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateEnquiryDto) {
    const phone = normalizeIndianPhone(dto.customerPhone);
    const customerName = dto.customerName.trim();
    if (!customerName) throw new BadRequestException('Customer name is required.');

    const result = await this.dataSource.transaction(async (manager) => {
      const generation = await manager.findOne(Generation, {
        where: { id: dto.generationId, userId },
        relations: { fabric: true },
      });
      if (!generation) throw new NotFoundException('Try-on not found.');
      if (await manager.exists(Enquiry, { where: { generationId: generation.id } })) {
        throw new ConflictException('This try-on already has an enquiry.');
      }

      let customer = await manager.findOne(Customer, { where: { userId, phone } });
      if (customer) {
        customer.name = customerName;
        customer.whatsappOptIn = dto.whatsappOptIn;
      } else {
        customer = manager.create(Customer, {
          userId,
          name: customerName,
          phone,
          whatsappOptIn: dto.whatsappOptIn,
        });
      }
      customer = await manager.save(Customer, customer);

      if (dto.savePreview) {
        const bytes = Buffer.from(dto.resultBase64 ?? '', 'base64');
        if (
          !bytes.length || bytes.length > 8 * 1024 * 1024 ||
          bytes[0] !== 0xff || bytes[1] !== 0xd8
        ) {
          throw new BadRequestException('Preview must be a JPEG under 8 MB.');
        }
        generation.resultBase64 = dto.resultBase64!;
        await manager.save(Generation, generation);
      }

      return manager.save(Enquiry, manager.create(Enquiry, {
        userId,
        customerId: customer.id,
        generationId: generation.id,
        fabricId: generation.fabricId,
        fabricName: generation.fabric?.name ?? null,
        garmentType: generation.garmentType,
        status: dto.status,
        estimatedPrice: dto.estimatedPrice ?? null,
        notes: dto.notes?.trim() || null,
      }));
    });
    return this.findOne(userId, result.id);
  }

  async findAll(userId: string, status?: string) {
    if (status && status !== 'interested' && status !== 'ordered') {
      throw new BadRequestException('Invalid enquiry status.');
    }
    const records = await this.enquiries.find({
      where: { userId, ...(status ? { status: status as EnquiryStatus } : {}) },
      relations: { customer: true },
      order: { createdAt: 'DESC' },
    });
    return records.map(summary);
  }

  async findOne(userId: string, id: string) {
    const enquiry = await this.enquiries.findOne({
      where: { id, userId },
      relations: { customer: true, generation: true },
    });
    if (!enquiry) throw new NotFoundException('Enquiry not found.');
    const [fabric, history] = await Promise.all([
      enquiry.fabricId
        ? this.fabrics.findOne({ where: { id: enquiry.fabricId, userId } })
        : Promise.resolve(null),
      this.enquiries.find({
        where: { userId, customerId: enquiry.customerId },
        relations: { customer: true },
        order: { createdAt: 'DESC' },
      }),
    ]);
    return {
      ...summary(enquiry),
      resultBase64: enquiry.generation.resultBase64,
      fabricImageBase64: fabric?.imageBase64 ?? null,
      customerHistory: history.map(summary),
    };
  }

  async update(userId: string, id: string, dto: UpdateEnquiryDto) {
    const enquiry = await this.enquiries.findOne({ where: { id, userId } });
    if (!enquiry) throw new NotFoundException('Enquiry not found.');
    if (dto.status !== undefined) enquiry.status = dto.status;
    if (dto.estimatedPrice !== undefined) enquiry.estimatedPrice = dto.estimatedPrice;
    if (dto.notes !== undefined) enquiry.notes = dto.notes?.trim() || null;
    await this.enquiries.save(enquiry);
    return this.findOne(userId, id);
  }
}
