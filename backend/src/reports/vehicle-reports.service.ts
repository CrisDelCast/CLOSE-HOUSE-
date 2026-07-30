// src/vehicle-reports/vehicle-reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleStatusReport } from './entities/vehicle-status-report.entity';
import { CreateVehicleReportDto } from './dto/create-vehicle-report.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { Vehicle } from '../properties/entities/vehicle.entity';

@Injectable()
export class VehicleReportsService {
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
    // 🔍 1. Revisa qué está llegando a 'file'
    console.log('--- DEPURANDO IMAGEN ---');
    console.log('Archivo recibido en backend:', file ? { filename: file.originalname, size: file.size } : 'NO LLEGÓ ARCHIVO');
    // Validar que el vehículo pertenezca al tenant actual
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: dto.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado en este conjunto.');
    }

    let imageUrl = dto.imageUrl;

    // Si se adjuntó un archivo físico por FormData, lo subimos a Cloudinary
    if (file) {
        try {
            console.log('Subiendo imagen a Cloudinary...');
            imageUrl = await this.cloudinaryService.uploadImage(file);
            console.log('URL generada por Cloudinary:', imageUrl);
          } catch (cloudinaryError) {
            console.error('Error al subir a Cloudinary:', cloudinaryError);
            throw new Error('Fallo al subir la imagen a Cloudinary');
          }
    }

    const report = this.reportRepo.create({
      tenantId,
      userId,
      vehicleId: dto.vehicleId,
      status: dto.status,
      observations: dto.observations,
      imageUrl,
    });

    const savedReport = await this.reportRepo.save(report);
    console.log('Reporte guardado en BD con URL:', savedReport.imageUrl);
    return savedReport;
  }

  async findAllByTenant(tenantId: string) {
    return await this.reportRepo.find({
      where: { tenantId },
      relations: ['vehicle', 'user'],
      order: { createdAt: 'DESC' },
    });
  }
}