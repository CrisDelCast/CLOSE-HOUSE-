import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralReport } from './entities/general-report.entity';
import { CreateGeneralReportDto } from './dto/create-general-report.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Injectable()
export class GeneralReportsService {
  private readonly logger = new Logger(GeneralReportsService.name);

  constructor(
    @InjectRepository(GeneralReport)
    private readonly reportRepo: Repository<GeneralReport>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateGeneralReportDto,
    file?: Express.Multer.File,
  ) {
    const warnings: string[] = [];
    let imageUrl = dto.imageUrl;

    if (file) {
      if (!this.cloudinaryService.isConfigured()) {
        this.logger.warn('Cloudinary no configurado: minuta general guardada sin imagen.');
        warnings.push('El servicio de imágenes no está configurado. El reporte se guardó sin foto.');
      } else {
        try {
          imageUrl = await this.cloudinaryService.uploadImage(file, 'general-reports');
        } catch (error) {
          this.logger.error('Error al subir imagen a Cloudinary', error);
          warnings.push('No se pudo subir la imagen. El reporte se guardó sin foto.');
        }
      }
    }

    const report = this.reportRepo.create({
      tenantId,
      userId,
      reportType: dto.reportType,
      description: dto.description.trim(),
      imageUrl,
    });

    const savedReport = await this.reportRepo.save(report);

    if (warnings.length > 0) {
      return { ...savedReport, warnings };
    }

    return savedReport;
  }

  async findAllByTenant(tenantId: string) {
    return this.reportRepo.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
