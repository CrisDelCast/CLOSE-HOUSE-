import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GuardRound } from './guard-round.entity';
import { TenantControlPoint } from './tenant-control-point.entity';

@Entity({ name: 'guard_round_checks' })
export class GuardRoundCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'scanned_at', type: 'timestamp' })
  scannedAt: Date;

  @Column({ name: 'is_valid', type: 'boolean', default: true })
  isValid: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'round_id', type: 'uuid', nullable: true })
  roundId: string;

  @ManyToOne(() => GuardRound, (round) => round.checks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'round_id' })
  round: GuardRound;

  @Column({ name: 'control_point_id', type: 'uuid', nullable: true })
  controlPointId: string;

  @ManyToOne(() => TenantControlPoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'control_point_id' })
  controlPoint: TenantControlPoint;
}