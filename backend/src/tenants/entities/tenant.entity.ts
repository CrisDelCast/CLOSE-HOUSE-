import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Resident } from '../../residents/entities/resident.entity';
import { User } from '../../users/entities/user.entity';
import { Visitor } from '../../visitors/entities/visitor.entity';
import { TenantRoundConfig } from './tenant-round-config.entity';// Asegúrate de crear este archivo al lado
import { ExamQuestion } from '../../exams/entities/exam-question.entity';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  // 📞 Configuración y capacidad de infraestructura
  @Column({ name: 'phone_code' })
  phoneCode: string;

  @Column({ name: 'total_units', type: 'integer' })
  totalUnits: number;

  @Column({ name: 'total_parking_slots', type: 'integer' })
  totalParkingSlots: number;

  @Column({ name: 'schedule_type' })
  scheduleType: string;

  // 👥 Información de contacto del Administrador
  @Column({ name: 'admin_name' })
  adminName: string;

  @Column({ name: 'admin_email' })
  adminEmail: string;

  @Column({ name: 'admin_phone' })
  adminPhone: string;

  // 📄 Normativas internas del conjunto residencial
  @Column({ name: 'rules_text', type: 'text', nullable: true })
  rulesText?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // =====================================================================
  // RELACIONES EXISTENTES (Uno a Muchos)
  // =====================================================================
  @OneToMany(() => Resident, (resident) => resident.tenant)
  residents?: Resident[];

  @OneToMany(() => User, (user) => user.tenant)
  users?: User[];

  @OneToMany(() => Visitor, (visitor) => visitor.tenant)
  visitors?: Visitor[];

  // =====================================================================
  // NUEVAS RELACIONES (Configuración Avanzada)
  // =====================================================================
  
  // El cascade: true permite que cuando guardes un Tenant con su roundConfig, 
  // TypeORM inserte la fila en ambas tablas automáticamente en una sola consulta.
  @OneToOne(() => TenantRoundConfig, (config) => config.tenant, { cascade: true, nullable: true })
  roundConfig?: TenantRoundConfig;

  @OneToMany(() => ExamQuestion, (question) => question.tenant)
  examQuestions?: ExamQuestion[];
}