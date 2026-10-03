import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Generation } from './generation.entity';
import { User } from './user.entity';

export type EnquiryStatus = 'interested' | 'ordered';

@Entity('enquiries')
@Index(['userId', 'status', 'createdAt'])
export class Enquiry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'uuid', name: 'generation_id', unique: true })
  generationId!: string;

  @Column({ type: 'uuid', name: 'fabric_id', nullable: true })
  fabricId!: string | null;

  @Column({ type: 'varchar', name: 'fabric_name', nullable: true })
  fabricName!: string | null;

  @Column({ type: 'varchar', name: 'garment_type' })
  garmentType!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: EnquiryStatus;

  @Column({ type: 'integer', name: 'estimated_price', nullable: true })
  estimatedPrice!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Customer, (customer) => customer.enquiries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @ManyToOne(() => Generation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'generation_id' })
  generation!: Generation;
}
