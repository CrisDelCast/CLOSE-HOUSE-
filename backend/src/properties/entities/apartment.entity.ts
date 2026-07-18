import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity'; 
import { Resident } from '../../residents/entities/resident.entity';
import { ParkingSpot } from './parking-spot.entity'; // 👈 Importa la entidad de parqueaderos

@Entity({ name: 'apartments' })
export class Apartment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  number: string; 

  @Column({ type: 'varchar', nullable: true })
  block: string; 

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => Resident, (resident) => resident.apartment)
  residents: Resident[];

  // 👈 RELACIÓN AL 100%: Un apartamento puede tener asignados varios parqueaderos (o uno)
  @OneToMany(() => ParkingSpot, (parkingSpot) => parkingSpot.apartment)
  parkingSpots: ParkingSpot[];
}