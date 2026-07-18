import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm'; // 1. Agrega OneToMany
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Apartment } from './apartment.entity';
import { Vehicle } from './vehicle.entity'; // 2. Asegúrate de importar tu entidad Vehicle

@Entity({ name: 'parking_spots' })
export class ParkingSpot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  number: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'apartment_id', type: 'uuid', nullable: true })
  apartmentId: string;

  @ManyToOne(() => Apartment, (apartment) => apartment.parkingSpots, { onDelete: 'SET NULL' }) // 3. Relación inversa
  @JoinColumn({ name: 'apartment_id' })
  apartment: Apartment;

  // 👇 LA PIEZA QUE FALTABA:
  @OneToMany(() => Vehicle, (vehicle) => vehicle.parkingSpot)
  vehicles: Vehicle[];
}