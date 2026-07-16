import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    JoinColumn,
  } from 'typeorm';
  import { Tenant } from '../../tenants/entities/tenant.entity';
  
  @Entity({ name: 'tenant_exam_questions' })
  export class ExamQuestion {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'question_text', type: 'text' })
    questionText: string;
  
    // jsonb almacena eficientemente el arreglo de strings ['Opción A', 'Opción B', ...]
    @Column({ type: 'jsonb' })
    options: string[];
  
    @Column({ name: 'correct_answer_index', type: 'integer' })
    correctAnswerIndex: number;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @ManyToOne(() => Tenant, (tenant) => tenant.examQuestions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
  }