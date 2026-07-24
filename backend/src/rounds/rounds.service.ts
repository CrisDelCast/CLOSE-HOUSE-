// 📄 src/rounds/rounds.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TenantRoundConfig } from '../tenants/entities/tenant-round-config.entity';
import { ScanQrDto } from './dto/scan-qr.dto';
import { GuardRound } from './entities/guard-round.entity';
import { GuardRoundCheck } from './entities/guard-round-check.entity';
import { TenantControlPoint } from './entities/tenant-control-point.entity';
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 1. Obtener ronda activa del portero
   */
  async getActiveRound(userId: string, tenantId: string) {
    if (!tenantId) return null;

    const round = await this.roundRepo.findOne({
      where: { tenantId: tenantId, userId: userId, status: 'IN_PROGRESS' },
      relations: ['checks', 'checks.controlPoint', 'user'],
    });
  
    if (!round) return null;
  
    const isExpired = await this.checkAndExpireRound(round, tenantId);
    if (isExpired) {
      return null;
    }
  
    const config = await this.configRepo.findOne({ where: { tenantId: tenantId } });

    return {
      ...round,
      timeBetweenPoints: config ? config.timeBetweenPoints : 10,
    };
  }

  /**
   * 2. Iniciar nueva ronda de vigilancia
   */
  async startRound(userId: string, tenantId: string, notes?: string) {
    const existingRound = await this.roundRepo.findOne({
      where: { tenantId, userId, status: 'IN_PROGRESS' },
      relations: ['user'],
    });

    if (existingRound) {
      existingRound.status = 'ABANDONED';
      existingRound.completedAt = new Date();
      await this.roundRepo.save(existingRound);

      try {
        if (existingRound.user && existingRound.user.email) {
          await this.notificationsService.notifyRoundAbandoned(
            existingRound.user.email,
            existingRound.id,
            notes
          );
        }
      } catch (error) {
        console.error('Error al enviar correo de ronda abandonada:', error);
      }
    }

    const round = this.roundRepo.create({
      tenantId: tenantId,
      userId: userId,
      status: 'IN_PROGRESS',
    });
    const savedRound = await this.roundRepo.save(round);

    const config = await this.configRepo.findOne({ where: { tenantId } });

    return {
      ...savedRound,
      timeBetweenPoints: config ? config.timeBetweenPoints : 10,
    };
  }

  /**
   * 3. Procesar escaneo QR con soporte para Punto Maestro y Puntos Externos (Máximo 2 visitas/día)
   */
  async scanPoint(userId: string, tenantId: string, scanDto: ScanQrDto) {
    const round = await this.getActiveRound(userId, tenantId);
    if (!round) {
      throw new BadRequestException('No tienes ninguna ronda activa en curso o tu ronda ha expirado.');
    }

    // Buscar el punto físico al que pertenece el QR escaneado
    const scannedPoint = await this.pointRepo.findOne({
      where: { 
        qrCodeToken: scanDto.qrCodeToken, 
        tenantId: tenantId 
      },
    });
    if (!scannedPoint) {
      throw new NotFoundException('Código QR no reconocido para este conjunto.');
    }

    // Cargar configuración de tiempos del tenant
    const config = await this.configRepo.findOne({ 
      where: { tenantId: tenantId } 
    });
    if (!config) {
      throw new BadRequestException('Configuración de rondas no definida para este conjunto.');
    }

    // Ordenar marcaciones previas usando la secuencia de su punto de control (excluyendo externos y master si es necesario, o filtrando normales)
    const checksDone = round.checks
      .filter(c => {
        const name = c.controlPoint?.name.toUpperCase() || '';
        return !name.includes('MASTER') && !name.includes('EXTERNO');
      })
      .sort((a, b) => a.controlPoint.sequenceOrder - b.controlPoint.sequenceOrder);
    
    const nextExpectedOrder = checksDone.length + 1;

    // 🔑 DETECCIÓN DE TIPOS DE PUNTO
    const isMaster = scannedPoint.name.toUpperCase().includes('MASTER');
    const isExternal = scannedPoint.name.toUpperCase().includes('EXTERNO');
    let targetPoint = scannedPoint;

    if (isExternal) {
      // Validar límite de 2 visitas diarias para puntos externos
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const externalChecksTodayCount = await this.checkRepo
        .createQueryBuilder('check')
        .innerJoin('check.controlPoint', 'point')
        .where('point.id = :pointId', { pointId: scannedPoint.id })
        .andWhere('check.scannedAt >= :todayStart', { todayStart })
        .andWhere('check.isValid = :isValid', { isValid: true })
        .getCount();

      if (externalChecksTodayCount >= 2) {
        throw new BadRequestException(
          `El punto externo "${scannedPoint.name}" ya ha cumplido con el límite de 2 visitas permitidas para el día de hoy.`
        );
      }

      targetPoint = scannedPoint;

    } else if (isMaster) {
      const expectedPoint = await this.pointRepo.findOne({
        where: { tenantId: tenantId, sequenceOrder: nextExpectedOrder }
      });

      if (!expectedPoint) {
        throw new BadRequestException('No hay más puntos pendientes por completar en esta ronda.');
      }

      targetPoint = expectedPoint;
    } else {
      // Validación 1: Verificar el orden secuencial normal del punto escaneado
      if (scannedPoint.sequenceOrder !== nextExpectedOrder) {
        const expectedPoint = await this.pointRepo.findOne({
          where: { tenantId: tenantId, sequenceOrder: nextExpectedOrder }
        });
        const expectedName = expectedPoint ? `"${expectedPoint.name}"` : `punto #${nextExpectedOrder}`;
        
        throw new BadRequestException(
          `Orden incorrecto. Debes escanear el punto #${nextExpectedOrder}: ${expectedName}`
        );
      }
    }

    // Validación 2: Control de tiempos entre puntos (Aplica para normales y máster; los externos pueden quedar libres o aplicar validación opcional)
    if (!isExternal && checksDone.length > 0) {
      const lastCheck = checksDone[checksDone.length - 1];
      
      const nowMs = Date.now(); 
      const lastScannedMs = lastCheck.scannedAt.getTime(); 

      const diffMs = nowMs - lastScannedMs;
      const actualDiff = diffMs / 60000;

      if (actualDiff < config.timePerPoint) {
        const remaining = Math.ceil(config.timePerPoint - actualDiff);
        throw new BadRequestException(
          `Debes patrullar el punto anterior durante al menos ${config.timePerPoint} minutos. Falta esperar ${remaining} min.`
        );
      }
    }

    // 4. Registrar marcación válida
    let checkNotes = scanDto.notes;
    if (isMaster) {
      checkNotes = `[PUNTO MASTER] Validado remotamente desde portería. ${scanDto.notes || ''}`;
    } else if (isExternal) {
      checkNotes = `[PUNTO EXTERNO] Visita registrada (Independiente de ronda). ${scanDto.notes || ''}`;
    }

    const check = this.checkRepo.create({
      roundId: round.id,
      controlPointId: targetPoint.id,
      notes: checkNotes,
      isValid: true,
    });
    await this.checkRepo.save(check);

    // Si es un punto externo, no afecta la finalización de la ronda normal
    if (isExternal) {
      return {
        message: `Punto externo "${targetPoint.name}" registrado con éxito (Visita registrada).`,
        check,
        roundCompleted: false
      };
    }

    // 🔑 LÓGICA DE CIERRE: Validar frente al total de puntos normales (excluyendo MASTER y EXTERNO)
    const updatedRound = await this.roundRepo.findOne({
      where: { id: round.id },
      relations: ['checks', 'checks.controlPoint'],
    });

    const totalNormalPoints = await this.pointRepo
      .createQueryBuilder('point')
      .where('point.tenantId = :tenantId', { tenantId })
      .andWhere('UPPER(point.name) NOT LIKE :master', { master: '%MASTER%' })
      .andWhere('UPPER(point.name) NOT LIKE :external', { external: '%EXTERNO%' })
      .getCount();

    const completedNormalChecks = updatedRound?.checks.filter(
      c => {
        const name = c.controlPoint?.name.toUpperCase() || '';
        return !name.includes('MASTER') && !name.includes('EXTERNO');
      }
    ).length || 0;

    if (completedNormalChecks >= totalNormalPoints) {
      const roundToComplete = await this.roundRepo.findOne({ where: { id: round.id } });
      if (roundToComplete) {
        roundToComplete.status = 'COMPLETED';
        roundToComplete.completedAt = new Date();
        await this.roundRepo.save(roundToComplete);
      }
      
      return { 
        message: '¡Excelente! Has finalizado exitosamente todos los puntos de la ronda.', 
        check, 
        roundCompleted: true 
      };
    }

    const successMessage = isMaster
      ? `Punto #${targetPoint.sequenceOrder} ("${targetPoint.name}") registrado exitosamente vía Punto Maestro.`
      : `Punto #${targetPoint.sequenceOrder} registrado con éxito.`;

    return { 
      message: successMessage, 
      check, 
      roundCompleted: false 
    };
  }

  async findCompletedByTenant(tenantId: string, filters?: { startDate?: string; endDate?: string }) {
    const query = this.roundRepo.createQueryBuilder('round')
      .leftJoinAndSelect('round.checks', 'checks')
      .leftJoinAndSelect('checks.controlPoint', 'controlPoint')
      .leftJoin('round.user', 'user')
      .addSelect(['user.id', 'user.fullName', 'user.email'])
      .where('round.tenantId = :tenantId', { tenantId });

    if (filters?.startDate && filters.startDate.trim() !== '') {
      const start = new Date(`${filters.startDate}T00:00:00.000Z`);
      query.andWhere('round.startedAt >= :startDate', { startDate: start });
    }
    
    if (filters?.endDate && filters.endDate.trim() !== '') {
      const end = new Date(`${filters.endDate}T23:59:59.999Z`);
      query.andWhere('round.startedAt <= :endDate', { endDate: end });
    }

    query.orderBy('round.startedAt', 'DESC');

    const rounds = await query.getMany();

    if (!rounds || rounds.length === 0) {
      return [];
    }

    return rounds.map((round) => {
      const validChecks = round.checks ? round.checks.filter(c => {
        const name = c.controlPoint?.name.toUpperCase() || '';
        return !name.includes('MASTER') && !name.includes('EXTERNO');
      }) : [];

      const completedCheckpointsCount = validChecks.length;
      const totalCheckpointsCount = validChecks.length > 0 
        ? Math.max(...validChecks.map(c => c.controlPoint?.sequenceOrder || 0), completedCheckpointsCount)
        : 0;

      return {
        id: round.id,
        tenantId: round.tenantId,
        guard: { fullName: round.user?.fullName || 'Sin asignar' },
        completedCheckpointsCount,
        totalCheckpointsCount,
        status: round.status,
        startedAt: round.startedAt,
        completedAt: round.completedAt,
      };
    });
  }

  async forceExpireActiveRound(userId: string, tenantId: string) {
    const round = await this.roundRepo.findOne({
      where: { tenantId, userId, status: 'IN_PROGRESS' },
      relations: ['user'],
    });

    if (!round) {
      return { message: 'No hay ronda activa para expirar.' };
    }

    round.status = 'ABANDONED';
    round.completedAt = new Date();
    await this.roundRepo.save(round);

    try {
      if (round.user && round.user.email) {
        await this.notificationsService.notifyRoundAbandoned(
          round.user.email,
          round.id
        );
      }
    } catch (error) {
      console.error('Error al enviar correo de ronda abandonada:', error);
    }

    return { message: 'Ronda marcada como abandonada correctamente.' };
  }

  private async checkAndExpireRound(round: GuardRound, tenantId: string): Promise<boolean> {
    if (round.status !== 'IN_PROGRESS') return false;
  
    if (!tenantId) {
      console.error('[Security] Intento de validar expiración sin tenantId');
      return false;
    }

    const config = await this.configRepo.findOne({ 
      where: { tenantId: tenantId }
    });

    if (!config || !config.timeBetweenPoints) {
      console.warn(`[Rondas] No se encontró configuración de tiempo para el tenant: ${tenantId}`);
      return false;
    }
  
    const nowMs = Date.now();
    const startedAtMs = round.startedAt.getTime();
    const diffMinutes = (nowMs - startedAtMs) / 60000;
  
    if (diffMinutes > config.timeBetweenPoints) {
      round.status = 'ABANDONED';
      round.completedAt = new Date();
      await this.roundRepo.save(round);
  
      try {
        if (round.user && round.user.email) {
          await this.notificationsService.notifyRoundAbandoned(
            round.user.email, 
            round.id
          );
        }
      } catch (error) {
        console.error('Error al enviar correo de ronda abandonada:', error);
      }
  
      return true;
    }
  
    return false;
  }
}