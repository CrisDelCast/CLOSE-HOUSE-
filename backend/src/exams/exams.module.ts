import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { ExamQuestion } from './entities/exam-question.entity';
import { TenantsModule } from '../tenants/tenants.module'; // Importante para validar la existencia del Tenant

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamQuestion]),
    TenantsModule, // Te da acceso a TenantsService
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}