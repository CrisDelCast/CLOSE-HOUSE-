import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ParkingSpot } from './parking-spot.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'vehicles' })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  plate: string; // Ej: "ABC123"

  @Column({ type: 'varchar', nullable: true })
  brand: string; // Ej: "Mazda"

  @Column({ type: 'varchar', nullable: true })
  color: string; // Ej: "Gris"

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'parking_spot_id', type: 'uuid', nullable: true })
  parkingSpotId: string;

  // El vehículo apunta directamente al espacio físico asignado
  @ManyToOne(() => ParkingSpot, (spot) => spot.vehicles, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parking_spot_id' })
  parkingSpot: ParkingSpot;
}