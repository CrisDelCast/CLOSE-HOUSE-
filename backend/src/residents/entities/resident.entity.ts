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
import { Apartment } from '../../properties/entities/apartment.entity';

@Entity({ name: 'residents' })
export class Resident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' }) // Especificamos tipo uuid para mantener consistencia
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

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'apartment_id', type: 'uuid', nullable: true })
  apartmentId: string;

  @ManyToOne(() => Apartment, (apartment) => apartment.residents, { 
    onDelete: 'SET NULL' 
  })
  @JoinColumn({ name: 'apartment_id' })
  apartment: Apartment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}