// src/contractors/contractors.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractorsService } from './contractors.service';
import { ContractorsController } from './contractors.controller';
import { ContractorAccess } from './entities/contractor-access.entity';
import { Apartment } from '../properties/entities/apartment.entity';// Asegúrate de ajustar la ruta a tu entidad Apartment

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractorAccess, Apartment]),
  ],
  controllers: [ContractorsController],
  providers: [ContractorsService],
  exports: [ContractorsService],
})
export class ContractorsModule {}