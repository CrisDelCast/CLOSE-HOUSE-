import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Vehicle } from '../../properties/entities/vehicle.entity';
import { User } from '../../users/entities/user.entity';

export enum VehicleReportStatus {
  BIEN = 'BIEN',
  REGULAR = 'REGULAR',
  MAL = 'MAL',
  NOVEDAD = 'NOVEDAD',
}

@Entity('vehicle_status_reports')
export class VehicleStatusReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'vehicle_id' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: VehicleReportStatus, default: VehicleReportStatus.BIEN })
  status: VehicleReportStatus;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}