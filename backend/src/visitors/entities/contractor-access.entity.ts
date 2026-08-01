// src/contractors/entities/contractor-access.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Apartment } from '../../properties/entities/apartment.entity';

export enum ContractorStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
  }
@Entity('contractor_accesses')
export class ContractorAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  company: string;

  @Column()
  documentNumber: string;

  @Column()
  fullName: string;

  @Column()
  time: string;

  @Column()
  procedureType: string;

  @Column()
  apartmentId: string;

  @ManyToOne(() => Apartment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'apartmentId' })
  apartment: Apartment;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'enum',
    enum: ContractorStatus,
    default: ContractorStatus.PENDING,
  })
  status: ContractorStatus;
}