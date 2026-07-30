import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralReport } from './entities/general-report.entity';
import { GeneralReportsController } from './general-reports.controller';
import { GeneralReportsService } from './general-reports.service';
import { CloudinaryModule } from '../common/services/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([GeneralReport]), CloudinaryModule],
  controllers: [GeneralReportsController],
  providers: [GeneralReportsService],
  exports: [GeneralReportsService],
})
export class GeneralReportsModule {}
