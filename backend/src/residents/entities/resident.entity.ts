import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'residents' })
export class Resident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.residents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ name: 'unit_number' })
  unitNumber: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'vehicle_plate', nullable: true })
  vehiclePlate?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
