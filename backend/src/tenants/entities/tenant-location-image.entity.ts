import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity'; // Ajusta la ruta a tu entidad Tenant
import { TenantControlPoint } from '../../rounds/entities/tenant-control-point.entity';

@Entity('tenant_location_images')
export class TenantLocationImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'sequence_order', default: 0 })
  sequenceOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.locationImages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
  

  @Column({ name: 'checkpoint_id', type: 'uuid', nullable: true })
  checkpointId: string;

  @ManyToOne(() => TenantControlPoint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checkpoint_id' })
  checkpoint: TenantControlPoint;
}