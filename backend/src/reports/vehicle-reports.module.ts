// src/vehicle-reports/vehicle-reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleStatusReport } from './entities/vehicle-status-report.entity';
import { Vehicle } from '../properties/entities/vehicle.entity';
import { VehicleReportsController } from './vehicle-reports.controller';
import { VehicleReportsService } from './vehicle-reports.service';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { CloudinaryModule } from '../common/services/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleStatusReport, Vehicle]),CloudinaryModule],
  controllers: [VehicleReportsController],
  providers: [VehicleReportsService, CloudinaryService],
  exports: [VehicleReportsService],
})
export class VehicleReportsModule {}