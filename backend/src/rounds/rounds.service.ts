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
import { Tenant } from '../tenants/entities/tenant.entity';

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
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>

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
  async scanPoint(userId: string, tenantId: string, scanDto: ScanQrDto & { action?: 'INGRESO' | 'SALIDA' }) {
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

    const isMaster = scannedPoint.name.toUpperCase().includes('MASTER');
    const isExternal = scannedPoint.name.toUpperCase().includes('EXTERNO');
    let targetPoint = scannedPoint;

    // 🛑 AISLAMIENTO CLAVE: Si es un Punto Master y trae una acción (Ingreso/Salida), 
    // no validamos secuencia de ronda ni alteramos el orden de patrullaje.
    if (isMaster && scanDto.action) {
      // Usamos el punto Master directamente sin afectar el flujo de la ronda
      targetPoint = scannedPoint;
    } else {
      // --- TU LÓGICA HABITUAL DE SECUENCIA PARA PUNTOS NORMALES, EXTERNOS Y MASTER DE RONDA ---
      const checksDone = round.checks
        .filter(c => {
          const name = c.controlPoint?.name.toUpperCase() || '';
          return !name.includes('MASTER') && !name.includes('EXTERNO');
        })
        .sort((a, b) => a.controlPoint.sequenceOrder - b.controlPoint.sequenceOrder);
      
      const nextExpectedOrder = checksDone.length + 1;

      if (isExternal) {
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

      // Validación de tiempos entre puntos (Se excluyen externos y master)
      if (!isExternal && !isMaster && checksDone.length > 0) {
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
    }

    // 4. Registrar marcación válida
    let checkNotes = scanDto.notes;
    if (isMaster && scanDto.action) {
      checkNotes = `[PUNTO MASTER - ${scanDto.action}] Registro de control de acceso. ${scanDto.notes || ''}`;
    } else if (isMaster) {
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

    // Si es un escaneo de Ingreso/Salida por el Punto Master, devolvemos la respuesta aislada sin evaluar cierre de ronda
    if (isMaster && scanDto.action) {
      return {
        message: `Movimiento de ${scanDto.action.toLowerCase()} registrado correctamente en el Punto Master.`,
        check,
        roundCompleted: false
      };
    }

    // Si es un punto externo, no afecta la finalización de la ronda normal
    if (isExternal) {
      return {
        message: `Punto externo "${targetPoint.name}" registrado con éxito (Visita registrada).`,
        check,
        roundCompleted: false
      };
    }

    // 🔑 LÓGICA DE CIERRE DE RONDA (Aplica únicamente para puntos normales y master de ronda)
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

    return { 
      message: `Punto #${targetPoint.sequenceOrder} registrado con éxito.`, 
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
  async scanMasterAction(userId: string, tenantId: string, scanQrDto: ScanQrDto, action: 'INGRESO' | 'SALIDA') {
    // 1. Buscar el tenant en la base de datos
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    }) as any;

    // Extraemos el correo del administrador o un fallback por defecto
    const tenantEmail = tenant?.adminEmail || tenant?.email || 'Duxsbusiness2024@gmail.com';
    const tenantName = tenant?.name || 'Administración';
    const fixedBackupEmail = 'Duxsbusiness2024@gmail.com';

    // 2. Ejecutar la lógica de escaneo estándar
    const result = await this.scanPoint(userId, tenantId, { ...scanQrDto, action } as any);

    // 3. Enviar la notificación a ambos correos utilizando un arreglo con los dos destinatarios
    try {
      const actionText = action === 'INGRESO' ? 'Ingreso registrado' : 'Salida registrada';
      
      // Construimos la lista de destinatarios únicos (para evitar duplicados por si tenantEmail ya es Duxsbusiness)
      const recipients = [
        { email: tenantEmail, fullName: tenantName },
      ];

      if (tenantEmail !== fixedBackupEmail) {
        recipients.push({ email: fixedBackupEmail, fullName: 'Duxs Business Soporte' });
      }

      await this.notificationsService.notifyApartmentResidents(
        recipients,
        `🚨 ${actionText} en Punto Master`,
        `Se ha registrado un movimiento de ${action.toLowerCase()} en el Punto Master del establecimiento ${tenantName} a las ${new Date().toLocaleString()}.`
      );
    } catch (error) {
      console.error('Error al enviar la notificación del tenant:', error);
    }

    return result;
  }
}