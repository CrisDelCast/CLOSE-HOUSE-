import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamQuestion } from './entities/exam-question.entity';
import { CreateExamQuestionDto } from './dto/create-exam-question.dto';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(ExamQuestion)
    private readonly examQuestionRepository: Repository<ExamQuestion>,
    private readonly tenantsService: TenantsService,
  ) {}

  // Guarda una pregunta individual vinculada al Tenant actual
  async createQuestion(tenantId: string, createExamQuestionDto: CreateExamQuestionDto): Promise<ExamQuestion> {
    // Validar que el Tenant exista antes de asignarle preguntas
    await this.tenantsService.findById(tenantId);

    const question = this.examQuestionRepository.create({
      ...createExamQuestionDto,
      tenant: { id: tenantId }, // Asigna la relación usando el ID de forma limpia
    });

    return this.examQuestionRepository.save(question);
  }

  // Guarda múltiples preguntas enviadas en un arreglo (Útil para formularios masivos)
  async bulkCreateQuestions(tenantId: string, questionsDto: CreateExamQuestionDto[]) {
    await this.tenantsService.findById(tenantId);

    const questionsEntities = questionsDto.map((dto) =>
      this.examQuestionRepository.create({
        ...dto,
        tenant: { id: tenantId },
      }),
    );

    await this.examQuestionRepository.save(questionsEntities);

    return {
      success: true,
      message: `Se registraron con éxito ${questionsEntities.length} preguntas para este examen.`,
    };
  }

  // Obtiene todas las preguntas del examen asociadas al Tenant actual (Para mostrárselas al portero)
  async getExamByTenant(tenantId: string): Promise<ExamQuestion[]> {
    return this.examQuestionRepository.find({
      where: { tenant: { id: tenantId } },
      select: ['id', 'questionText', 'options'], // 🔐 Truco de seguridad: Omitimos "correctAnswerIndex" para que no se filtre en las respuestas de la API
      order: { createdAt: 'ASC' },
    });
  }
}