import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Fabric } from './fabric.entity';

@Entity('generations')
@Index(['userId', 'createdAt'])
export class Generation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'fabric_id', nullable: true })
  fabricId!: string | null;

  @Column({ type: 'varchar', name: 'garment_type' })
  garmentType!: string;

  @Column({ type: 'text', name: 'result_base64', nullable: true })
  resultBase64!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.generations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Fabric, (fabric) => fabric.generations, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'fabric_id' })
  fabric!: Fabric | null;
}
