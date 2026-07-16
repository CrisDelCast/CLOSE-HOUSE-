import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Tenant } from './tenant.entity';
  
  @Entity({ name: 'tenant_round_configs' })
  export class TenantRoundConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'total_round_points', type: 'int' })
    totalRoundPoints: number;
  
    @Column({ name: 'time_per_point', type: 'integer' })
    timePerPoint: number;
  
    @Column({ name: 'time_between_points', type: 'integer' })
    timeBetweenPoints: number;
  
    @Column({ name: 'vehicle_control_schedule' })
    vehicleControlSchedule: string;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
    tenantId: string;
  
    // Relación inversa Uno a Uno apuntando al Tenant
    @OneToOne(() => Tenant, (tenant) => tenant.roundConfig, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' }) // Crea la llave foránea física aquí
    tenant: Tenant;
  }