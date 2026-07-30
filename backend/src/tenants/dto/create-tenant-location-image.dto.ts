import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
// import { Checkpoint } from '../checkpoints/entities/checkpoint.entity'; // Ajusta la ruta según tu proyecto

@Entity('tenant_location_images')
export class TenantLocationImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  description: string;

  // Relación con el Tenant
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  // Relación con el Punto de Control (Checkpoint)
  @Column({ nullable: true })
  checkpointId: string; // 👈 Asegúrate de declarar explícitamente esta columna si quieres usarla por ID

  /* O si prefieres manejarlo como relación de TypeORM:
  @ManyToOne(() => Checkpoint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checkpointId' })
  checkpoint: Checkpoint;
  */
}