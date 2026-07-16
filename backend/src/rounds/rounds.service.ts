import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TenantRoundConfig } from '../tenants/entities/tenant-round-config.entity';
import { ScanQrDto } from './dto/scan-qr.dto';
import { GuardRound } from './entities/guard-round.entity';
import { GuardRoundCheck } from './entities/guard-round-check.entity';
import { TenantControlPoint } from './entities/tenant-control-point.entity';

@Injectable()
export class RoundsService {
  constructor(
    @InjectRepository(GuardRound)
    private readonly roundRepo: Repository<GuardRound>,
    @InjectRepository(GuardRoundCheck)
    private readonly checkRepo: Repository<GuardRoundCheck>,
    @InjectRepository(TenantControlPoint)
    private readonly pointRepo: Repository<TenantControlPoint>,
    @InjectRepository(TenantRoundConfig)
    private readonly configRepo: Repository<TenantRoundConfig>,
  ) {}

  /**
   * 1. Obtener ronda activa del portero
   */
  async getActiveRound(userId: string, tenantId: string) {
    return this.roundRepo.findOne({
      where: { 
        tenantId: tenantId, 
        userId: userId, 
        status: 'IN_PROGRESS' 
      },
      relations: ['checks', 'checks.controlPoint'],
    });
  }

  /**
   * 2. Iniciar nueva ronda de vigilancia
   */
  async startRound(userId: string, tenantId: string) {
    const active = await this.getActiveRound(userId, tenantId);
    if (active) {
      throw new BadRequestException('Ya tienes una ronda en progreso.');
    }

    const round = this.roundRepo.create({
      tenantId: tenantId,
      userId: userId,
      status: 'IN_PROGRESS',
    });
    return this.roundRepo.save(round);
  }

  /**
   * 3. Procesar escaneo QR con validación de tiempos, secuencias y finalización
   */
  async scanPoint(userId: string, tenantId: string, scanDto: ScanQrDto) {
    const round = await this.getActiveRound(userId, tenantId);
    if (!round) {
      throw new BadRequestException('No tienes ninguna ronda activa en curso.');
    }

    // Buscar el punto físico al que pertenece el QR escaneado
    const targetPoint = await this.pointRepo.findOne({
      where: { 
        qrCodeToken: scanDto.qrCodeToken, 
        tenantId: tenantId 
      },
    });
    if (!targetPoint) {
      throw new NotFoundException('Código QR no reconocido para este conjunto.');
    }

    // Cargar configuración de tiempos del tenant
    const config = await this.configRepo.findOne({ 
      where: { tenantId: tenantId } 
    });
    if (!config) {
      throw new BadRequestException('Configuración de rondas no definida para este conjunto.');
    }

    // Ordenar marcaciones previas usando la secuencia de su punto de control
    const checksDone = round.checks.sort((a, b) => a.controlPoint.sequenceOrder - b.controlPoint.sequenceOrder);
    const nextExpectedOrder = checksDone.length + 1;

    // Validación 1: Verificar el orden secuencial del punto escaneado
    if (targetPoint.sequenceOrder !== nextExpectedOrder) {
      // Buscar cómo se llama el punto que realmente debería escanear para darle feedback al guardia
      const expectedPoint = await this.pointRepo.findOne({
        where: { tenantId: tenantId, sequenceOrder: nextExpectedOrder }
      });
      const expectedName = expectedPoint ? `"${expectedPoint.name}"` : `punto #${nextExpectedOrder}`;
      
      throw new BadRequestException(
        `Orden incorrecto. Debes escanear el punto #${nextExpectedOrder}: ${expectedName}`
      );
    }

    if (checksDone.length > 0) {
      const lastCheck = checksDone[checksDone.length - 1];
      
      // 1. Obtener los milisegundos absolutos de ambos momentos
      const nowMs = Date.now(); // Milisegundos UTC exactos en Node.js
      const lastScannedMs = new Date(lastCheck.scannedAt).getTime(); // Milisegundos UTC del registro en BD

      // 2. Calcular la diferencia inicial de tiempo
      let diffMs = nowMs - lastScannedMs;

      // 3. Ajuste adaptativo de Zona Horaria (Local vs Producción)
      // Si la diferencia es menor a -1 minuto, significa que la base de datos guardó
      // el registro con el desfase de 5 horas de Colombia (UTC-5) y el servidor lee en UTC.
      const fiveHoursInMs = 5 * 60 * 60 * 1000;
      if (diffMs < -60000) {
        diffMs = diffMs + fiveHoursInMs;
      }

      // 4. Convertir la diferencia neta a minutos reales transcurridos
      const diffMinutes = diffMs / 60000;
      const actualDiff = diffMinutes < 0 ? 0 : diffMinutes;

      console.log(`[Rondas] Comparando tiempos de patrullaje:`);
      console.log(` - Servidor Node (Ahora): ${new Date(nowMs).toISOString()}`);
      console.log(` - Base de datos (Último escaneo): ${new Date(lastScannedMs).toISOString()}`);
      console.log(` - Diferencia neta: ${actualDiff.toFixed(2)} minutos`);

      if (actualDiff < config.timePerPoint) {
        const remaining = Math.ceil(config.timePerPoint - actualDiff);
        throw new BadRequestException(
          `Debes patrullar el punto anterior durante al menos ${config.timePerPoint} minutos. Falta esperar ${remaining} min.`
        );
      }
    }

    // 4. Registrar marcación válida
    const check = this.checkRepo.create({
      roundId: round.id,
      controlPointId: targetPoint.id,
      notes: scanDto.notes,
      isValid: true,
    });
    await this.checkRepo.save(check);

    // 5. ¿Es el último punto configurado? Completar la ronda
    if (targetPoint.sequenceOrder === config.totalRoundPoints) {
      round.status = 'COMPLETED';
      round.completedAt = new Date();
      await this.roundRepo.save(round);
      
      return { 
        message: '¡Excelente! Has finalizado exitosamente todos los puntos de la ronda.', 
        check, 
        roundCompleted: true 
      };
    }

    return { 
      message: `Punto #${targetPoint.sequenceOrder} registrado con éxito.`, 
      check, 
      roundCompleted: false 
    };
  }
}