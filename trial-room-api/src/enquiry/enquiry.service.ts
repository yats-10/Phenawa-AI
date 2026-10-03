import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
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
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Enquiry)
    private readonly enquiries: Repository<Enquiry>,
    @InjectRepository(Fabric)
    private readonly fabrics: Repository<Fabric>,
    private readonly dataSource: DataSource,
  ) {}

  async lookupCustomer(userId: string, phoneInput: string) {
    const phone = normalizeIndianPhone(phoneInput);
    const customer = await this.customers.findOne({ where: { userId, phone } });
    return customer
      ? { exists: true, customer: { id: customer.id, name: customer.name, phone: customer.phone } }
      : { exists: false, customer: null };
  }

  async create(userId: string, dto: CreateEnquiryDto) {
    const phone = normalizeIndianPhone(dto.customerPhone);

    const result = await this.dataSource.transaction(async (manager) => {
      const generation = await manager.findOne(Generation, {
        where: { id: dto.generationId, userId },
        relations: { fabric: true },
      });
      if (!generation) throw new NotFoundException('Try-on not found.');
      const sameGeneration = await manager.findOne(Enquiry, {
        where: { generationId: generation.id, userId },
      });
      if (sameGeneration) {
        return sameGeneration;
      }

      let customer = await manager.findOne(Customer, {
        where: { userId, phone },
        lock: { mode: 'pessimistic_write' },
      });
      if (!customer) {
        const customerName = dto.customerName?.trim();
        if (!customerName) {
          throw new BadRequestException('Customer name is required for a new mobile number.');
        }
        customer = manager.create(Customer, {
          userId,
          name: customerName,
          phone,
        });
        customer = await manager.save(Customer, customer);
      }

      // Keep one fabric/garment choice per customer. An order takes precedence
      // over an earlier interested status; repeat try-ons do not inflate stats.
      const existingChoice = await manager.findOne(Enquiry, {
        where: {
          userId,
          customerId: customer.id,
          fabricId: generation.fabricId ?? IsNull(),
          garmentType: generation.garmentType,
        },
        order: { createdAt: 'DESC' },
      });
      if (existingChoice) {
        if (dto.status === 'ordered') existingChoice.status = 'ordered';
        if (dto.estimatedPrice !== undefined) existingChoice.estimatedPrice = dto.estimatedPrice;
        if (dto.notes?.trim()) existingChoice.notes = dto.notes.trim();
        return manager.save(Enquiry, existingChoice);
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
      relations: { customer: true },
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
      fabricImageBase64: fabric?.imageBase64 ?? null,
      customerHistory: history.map(summary),
    };
  }

  async popularFabrics(userId: string) {
    const rows = await this.enquiries
      .createQueryBuilder('enquiry')
      .select('enquiry.fabricId', 'fabricId')
      .addSelect('enquiry.fabricName', 'fabricName')
      .addSelect('COUNT(DISTINCT enquiry.customerId)', 'customers')
      .addSelect("COUNT(DISTINCT CASE WHEN enquiry.status = 'interested' THEN enquiry.customerId END)", 'interested')
      .addSelect("COUNT(DISTINCT CASE WHEN enquiry.status = 'ordered' THEN enquiry.customerId END)", 'ordered')
      .where('enquiry.userId = :userId', { userId })
      .andWhere('enquiry.fabricId IS NOT NULL')
      .groupBy('enquiry.fabricId')
      .addGroupBy('enquiry.fabricName')
      .orderBy('customers', 'DESC')
      .addOrderBy('ordered', 'DESC')
      .limit(5)
      .getRawMany<{ fabricId: string; fabricName: string; customers: string; interested: string; ordered: string }>();
    return rows.map((row) => ({
      fabricId: row.fabricId,
      fabricName: row.fabricName,
      customers: Number(row.customers),
      interested: Number(row.interested),
      ordered: Number(row.ordered),
    }));
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
