import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamQuestionDto } from './dto/create-exam-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // Endpoint para guardar preguntas del examen (Soportado como arreglo para mayor comodidad)
  @Post('questions')
  @Roles('ADMIN', 'SUPERADMIN')
  createQuestions(
    @TenantId() tenantId: string,
    @Body() createQuestionsDto: CreateExamQuestionDto[],
  ) {
    return this.examsService.bulkCreateQuestions(tenantId, createQuestionsDto);
  }

  // Endpoint para que el Frontend renderice el examen al portero al iniciar sesión
  @Get()
  @Roles('PORTERO', 'ADMIN')
  getExam(@TenantId() tenantId: string) {
    return this.examsService.getExamByTenant(tenantId);
  }
}