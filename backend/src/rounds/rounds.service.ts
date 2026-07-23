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
  
    // 🔍 AQUÍ ESTÁ LA CLAVE: Cada vez que se consulta la ronda activa, validamos si ya expiró
    const isExpired = await this.checkAndExpireRound(round, tenantId);
    if (isExpired) {
      return null; // Si expiró, la cerramos en BD y devolvemos null para que la vista pase a "Fuera de Ronda"
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
    // 🔒 Blindaje estricto: Búsqueda acotada al tenant y usuario actual
    const existingRound = await this.roundRepo.findOne({
      where: { tenantId, userId, status: 'IN_PROGRESS' },
      relations: ['user'],
    });

    if (existingRound) {
      existingRound.status = 'ABANDONED';
      existingRound.completedAt = new Date();
      // Si quieres guardar las notas del reporte en la ronda abandonada antes de cerrarla:
      // existingRound.notes = notes; 
      await this.roundRepo.save(existingRound);

      // Notificar por correo
      try {
        if (existingRound.user && existingRound.user.email) {
          await this.notificationsService.notifyRoundAbandoned(
            existingRound.user.email,
            existingRound.id,
            notes // Pasamos el reporte ingresado por el guardia si tu servicio lo recibe
          );
        }
      } catch (error) {
        console.error('Error al enviar correo de ronda abandonada:', error);
      }
    }

    // 2. Creamos la nueva ronda limpia asociada estrictamente al tenant correcto
    const round = this.roundRepo.create({
      tenantId: tenantId,
      userId: userId,
      status: 'IN_PROGRESS',
    });
    const savedRound = await this.roundRepo.save(round);

    // Consultamos la configuración asegurando el match exacto del tenant
    const config = await this.configRepo.findOne({ where: { tenantId } });

    return {
      ...savedRound,
      timeBetweenPoints: config ? config.timeBetweenPoints : 10,
    };
  }

  /**
   * 3. Procesar escaneo QR con validación de tiempos, secuencias y finalización
   */
  async scanPoint(userId: string, tenantId: string, scanDto: ScanQrDto) {
    const round = await this.getActiveRound(userId, tenantId);
    if (!round) {
      throw new BadRequestException('No tienes ninguna ronda activa en curso o tu ronda ha expirado.');
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
      const expectedPoint = await this.pointRepo.findOne({
        where: { tenantId: tenantId, sequenceOrder: nextExpectedOrder }
      });
      const expectedName = expectedPoint ? `"${expectedPoint.name}"` : `punto #${nextExpectedOrder}`;
      
      throw new BadRequestException(
        `Orden incorrecto. Debes escanear el punto #${nextExpectedOrder}: ${expectedName}`
      );
    }

    // Validación 2: Control de tiempos entre puntos (Inmune a desfaces de servidor)
    if (checksDone.length > 0) {
      const lastCheck = checksDone[checksDone.length - 1];
      
      const nowMs = Date.now(); 
      const lastScannedMs = lastCheck.scannedAt.getTime(); 

      const diffMs = nowMs - lastScannedMs;
      const actualDiff = diffMs / 60000; // Convertir a minutos netos

      console.log(`[Rondas] Comparación horaria exacta (TIMESTAMPTZ):`);
      console.log(` - Servidor Node (Ahora): ${new Date(nowMs).toISOString()}`);
      console.log(` - Base de datos (Último escaneo): ${new Date(lastScannedMs).toISOString()}`);
      console.log(` - Tiempo transcurrido real: ${actualDiff.toFixed(2)} minutos`);

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

  async findCompletedByTenant(tenantId: string, filters?: { startDate?: string; endDate?: string }) {
    console.log('Buscando todas las rondas para auditoría - Tenant:', tenantId, 'Filtros:', filters);
    
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
      const completedCheckpointsCount = round.checks ? round.checks.length : 0;
      const totalCheckpointsCount = round.checks && round.checks.length > 0 
        ? Math.max(...round.checks.map(c => c.controlPoint?.sequenceOrder || 0), completedCheckpointsCount)
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

  /**
   * 4. Forzar la expiración de la ronda activa y enviar notificación
   */
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
  
    // 🔒 Blindaje: Si no hay tenantId, rechazamos inmediatamente para evitar cruces
    if (!tenantId) {
      console.error('[Security] Intento de validar expiración sin tenantId');
      return false;
    }

    const config = await this.configRepo.findOne({ 
      where: { tenantId: tenantId } // Forzamos la llave exacta
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