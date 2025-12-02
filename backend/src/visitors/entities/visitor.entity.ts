import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Resident } from '../../residents/entities/resident.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export enum VisitorStatus {
  PENDING = 'PENDING',
  IN = 'IN',
  OUT = 'OUT',
  DENIED = 'DENIED',
}

@Entity({ name: 'visitors' })
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.visitors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'resident_id', nullable: true })
  residentId?: string;

  @ManyToOne(() => Resident, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resident_id' })
  resident?: Resident;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'document_type', length: 20 })
  documentType: string;

  @Column({ name: 'document_id', length: 40 })
  documentId: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

  @Column({ name: 'vehicle_plate', nullable: true, length: 10 })
  vehiclePlate?: string;

  @Column({ nullable: true, length: 200 })
  purpose?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'enum', enum: VisitorStatus, default: VisitorStatus.PENDING })
  status: VisitorStatus;

  @Column({ name: 'check_in_at', type: 'timestamptz', nullable: true })
  checkInAt?: Date;

  @Column({ name: 'check_out_at', type: 'timestamptz', nullable: true })
  checkOutAt?: Date;

  @Column({ name: 'authorized_by', nullable: true })
  authorizedBy?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorized_by' })
  authorizedByUser?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
