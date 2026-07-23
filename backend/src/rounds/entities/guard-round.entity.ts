import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity'; // Ajusta la ruta si es necesario
import { GuardRoundCheck } from './guard-round-check.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'guard_rounds' })
export class GuardRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', default: 'IN_PROGRESS' })
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string; // ID del vigilante que realiza la ronda

  @OneToMany(() => GuardRoundCheck, (check) => check.round)
  checks: GuardRoundCheck[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}