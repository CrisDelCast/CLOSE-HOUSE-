// 📄 src/rounds/control-points.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantControlPoint } from './entities/tenant-control-point.entity';
import { TenantRoundConfig } from '../tenants/entities/tenant-round-config.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class ControlPointsService {
  constructor(
    @InjectRepository(TenantControlPoint)
    private readonly pointRepo: Repository<TenantControlPoint>,
    
    @InjectRepository(TenantRoundConfig)
    private readonly configRepo: Repository<TenantRoundConfig>,
  ) {}

  /**
   * 1. Obtener todos los puntos de un conjunto ordenados por su secuencia
   */
  async findAllByTenant(tenantId: string) {
    return this.pointRepo.find({
      where: { tenantId },
      order: { sequenceOrder: 'ASC' },
    });
  }

  /**
   * 2. Crear un nuevo punto validando límites, secuencias y permitiendo el punto MASTER
   */
  async createPoint(name: string, sequenceOrder: number, tenantId: string) {
    const isMaster = name.toUpperCase().includes('MASTER');

    // A. Obtener la configuración del Tenant
    const config = await this.configRepo.findOne({
      where: { tenantId },
    });

    if (!config) {
      throw new BadRequestException(
        'Primero debes definir la configuración de rondas (límite de puntos, tiempos) para este conjunto.'
      );
    }

    // B. Contar cuántos puntos ya están registrados para este conjunto
    const currentPointsCount = await this.pointRepo.count({
      where: { tenantId },
    });

    // C. Validaciones específicas si NO es un punto Master
    if (!isMaster) {
      if (currentPointsCount >= config.totalRoundPoints) {
        throw new BadRequestException(
          `No es posible crear el punto. El conjunto tiene un límite máximo de ${config.totalRoundPoints} puntos de control en su configuración.`
        );
      }

      if (sequenceOrder > config.totalRoundPoints) {
        throw new BadRequestException(
          `El orden de secuencia #${sequenceOrder} excede el límite máximo de puntos (${config.totalRoundPoints}) permitido para este conjunto.`
        );
      }

      if (sequenceOrder <= 0) {
        throw new BadRequestException('El número de secuencia debe ser mayor a 0.');
      }

      // E. Validar si ya existe ese número de orden en el conjunto
      const existingOrder = await this.pointRepo.findOne({
        where: { tenantId, sequenceOrder },
      });

      if (existingOrder) {
        throw new BadRequestException(
          `Ya existe un punto de control con el orden #${sequenceOrder} ("${existingOrder.name}").`
        );
      }
    } else {
      // Si es un punto Master, aseguramos una secuencia neutral (ej: 0 o permitida) para que conviva sin chocar
      sequenceOrder = 0;
    }

    // F. Generar un token único y seguro para el QR
    const randomToken = randomBytes(16).toString('hex');
    const qrCodeToken = `QR_${tenantId.substring(0, 8)}_${randomToken}`;

    const newPoint = this.pointRepo.create({
      name,
      sequenceOrder,
      tenantId,
      qrCodeToken,
    });

    return this.pointRepo.save(newPoint);
  }
}