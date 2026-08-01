import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleStatusReport } from './entities/vehicle-status-report.entity';
import { CreateVehicleReportDto } from './dto/create-vehicle-report.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { Vehicle } from '../properties/entities/vehicle.entity';

@Injectable()
export class VehicleReportsService {
  private readonly logger = new Logger(VehicleReportsService.name);

  constructor(
    @InjectRepository(VehicleStatusReport)
    private readonly reportRepo: Repository<VehicleStatusReport>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateVehicleReportDto,
    file?: Express.Multer.File,
  ) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: dto.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado en este conjunto.');
    }

    const warnings: string[] = [];
    let imageUrl = dto.imageUrl;

    if (file) {
      if (!this.cloudinaryService.isConfigured()) {
        this.logger.warn('Cloudinary no configurado: reporte guardado sin imagen.');
        warnings.push('El servicio de imágenes no está configurado. El reporte se guardó sin foto.');
      } else {
        try {
          imageUrl = await this.cloudinaryService.uploadImage(file);
        } catch (error) {
          this.logger.error('Error al subir imagen a Cloudinary', error);
          warnings.push('No se pudo subir la imagen. El reporte se guardó sin foto.');
        }
      }
    }

    const report = this.reportRepo.create({
      tenantId,
      userId,
      vehicleId: dto.vehicleId,
      status: dto.status,
      observations: dto.observations,
      imageUrl,
      checklist: dto.checklist,
    });

    const savedReport = await this.reportRepo.save(report);

    if (warnings.length > 0) {
      return { ...savedReport, warnings };
    }

    return savedReport;
  }

  async findAllByTenant(tenantId: string) {
    return await this.reportRepo.find({
      where: { tenantId },
      relations: ['vehicle', 'user'],
      order: { createdAt: 'DESC' },
    });
  }
  async update(tenantId: string, id: string, userId: string, updateDto: CreateVehicleReportDto, file?: Express.Multer.File) {
    const existingReport = await this.reportRepo.findOne({
      where: { id, tenantId },
    });

    if (!existingReport) {
      throw new NotFoundException(`El reporte vehicular con ID ${id} no fue encontrado.`);
    }

    let imageUrl = existingReport.imageUrl;

    if (file) {
      // ☁️ Lógica de subida a Cloudinary para la actualización de la imagen nueva
      // imageUrl = await this.cloudinaryService.uploadImage(file);
    }

    // Actualizamos las propiedades del reporte existente
    existingReport.status = updateDto.status ?? existingReport.status;
    existingReport.observations = updateDto.observations ?? existingReport.observations;
    existingReport.checklist = updateDto.checklist ?? existingReport.checklist;
    existingReport.vehicleId = updateDto.vehicleId ?? existingReport.vehicleId;
    existingReport.userId = userId; // Actualiza quién realizó la última modificación
    if (imageUrl) {
      existingReport.imageUrl = imageUrl;
    }

    return await this.reportRepo.save(existingReport);
  }
}
