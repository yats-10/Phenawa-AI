import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Fabric } from './fabric.entity';
import { Generation } from './generation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  username!: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', name: 'shop_name' })
  shopName!: string;

  @Column({ type: 'varchar', name: 'owner_name' })
  ownerName!: string;

  @Column({ type: 'varchar' })
  phone!: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'timestamp', name: 'access_expires_at' })
  accessExpiresAt!: Date;

  @Column({ type: 'boolean', default: false, name: 'daily_alert_sent' })
  dailyAlertSent!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Fabric, (fabric) => fabric.user)
  fabrics!: Fabric[];

  @OneToMany(() => Generation, (generation) => generation.user)
  generations!: Generation[];
}
