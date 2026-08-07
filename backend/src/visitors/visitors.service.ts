import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { Resident } from '../residents/entities/resident.entity';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { DenyVisitorDto } from './dto/deny-visitor.dto';
import { Visitor, VisitorStatus } from './entities/visitor.entity';

@Injectable()
export class VisitorsService {
  private readonly logger = new Logger(VisitorsService.name);

  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async updateStatus(id: string, status: VisitorStatus) {
    const visitor = await this.visitorRepository.findOne({ where: { id } });
    if (!visitor) {
      throw new NotFoundException('Visitante no encontrado');
    }
    visitor.status = status;
    if (status === VisitorStatus.IN) {
      visitor.checkInAt = new Date();
    }
    return await this.visitorRepository.save(visitor);
  }

  async create(tenantId: string, dto: CreateVisitorDto) {
    const resident = await this.ensureResidentBelongsToTenant(
      dto.residentId,
      tenantId,
    );

    const visitor = this.visitorRepository.create({
      ...dto,
      tenantId,
      status: VisitorStatus.PENDING,
    });

    const savedVisitor = await this.visitorRepository.save(visitor);

    // 🌐 Detecta automáticamente si está en local (Ngrok) o en producción (Railway) mediante la variable de entorno
    const backendUrl = process.env.BACKEND_URL || 'https://motivated-kindness-production-e60a.up.railway.app';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5; border-radius: 8px; color: #18181b;">
        <h2 style="color: #27272a; margin-top: 0;">Solicitud de Ingreso de Visitante</h2>
        <p>Se ha registrado un visitante en portería:</p>
        
        <div style="background: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e4e4e7; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Nombre:</strong> ${visitor.fullName}</p>
          <p style="margin: 5px 0;"><strong>Documento:</strong> ${visitor.documentType} - ${visitor.documentId}</p>
          <p style="margin: 5px 0;"><strong>Propósito:</strong> ${visitor.purpose || 'No especificado'}</p>
          <p style="margin: 5px 0;"><strong>Vehículo (Placa):</strong> ${visitor.vehiclePlate || 'Ingreso peatonal'}</p>
        </div>

        <p style="text-align: center; font-weight: bold; margin: 20px 0 10px 0;">Por favor, seleccione una opción:</p>
        
        <div style="text-align: center;">
          <a href="${backendUrl}/api/visitors/respond?id=${savedVisitor.id}&action=APPROVED" 
             style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
            ✅ Aprobar Acceso
          </a>
          
          <a href="${backendUrl}/api/visitors/respond?id=${savedVisitor.id}&action=DENIED" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ❌ No Aprobar
          </a>
        </div>
        
        <p style="font-size: 11px; color: #71717a; text-align: center; margin-top: 25px;">
          Este es un correo automático generado por el sistema de control de portería.
        </p>
      </div>
    `;

    this.notificationsService.notifyApartmentResidents(
      [{ email: resident.email, fullName: resident.fullName }],
      `👤 Autorización Requerida: Visitante ${visitor.fullName} (${visitor.purpose || 'Visita'})`,
      'Solicitud de ingreso de visitante pendiente de aprobación.',
      htmlContent,
      true
    ).catch((error) => {
      this.logger.warn(`Error enviando correo de notificación de visita: ${error.message}`);
    });

    return savedVisitor;
  }

  findAll(tenantId: string, status?: VisitorStatus, residentId?: string) {
    return this.visitorRepository.find({
      where: {
        tenantId,
        ...(status ? { status } : {}),
        ...(residentId ? { residentId } : {}), // 👈 Añade esta línea para filtrar por residente
      },
      order: { createdAt: 'DESC' },
      relations: { resident: true },
    });
  }

  async checkIn(tenantId: string, visitorId: string, userId: string) {
    const visitor = await this.findOneOrFail(visitorId, tenantId);

    if (visitor.status === VisitorStatus.DENIED) {
      throw new BadRequestException('La visita fue rechazada.');
    }

    if (visitor.status === VisitorStatus.IN) {
      throw new BadRequestException('La visita ya se registró como dentro.');
    }

    visitor.status = VisitorStatus.IN;
    visitor.checkInAt = new Date();
    visitor.authorizedBy = userId;

    return this.visitorRepository.save(visitor);
  }

  async checkOut(tenantId: string, visitorId: string, userId: string) {
    const visitor = await this.findOneOrFail(visitorId, tenantId);

    if (visitor.status !== VisitorStatus.IN) {
      throw new BadRequestException(
        'Solo se puede dar salida a visitas que están dentro.',
      );
    }

    visitor.status = VisitorStatus.OUT;
    visitor.checkOutAt = new Date();
    visitor.authorizedBy = userId;

    return this.visitorRepository.save(visitor);
  }

  async deny(
    tenantId: string,
    visitorId: string,
    userId: string,
    dto: DenyVisitorDto,
  ) {
    const visitor = await this.findOneOrFail(visitorId, tenantId);

    if (visitor.status !== VisitorStatus.PENDING) {
      throw new BadRequestException('Solo puedes rechazar visitas pendientes.');
    }

    visitor.status = VisitorStatus.DENIED;
    visitor.notes = dto.notes ?? visitor.notes;
    visitor.authorizedBy = userId;

    return this.visitorRepository.save(visitor);
  }

  private async findOneOrFail(id: string, tenantId: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { id, tenantId },
      relations: { resident: { apartment: true } }, // Cargamos la relación en cascada si es necesario en las consultas particulares
    });

    if (!visitor) {
      throw new NotFoundException('La visita no existe.');
    }

    return visitor;
  }

  private async ensureResidentBelongsToTenant(
    residentId: string | undefined,
    tenantId: string,
  ): Promise<Resident | null> {
    if (!residentId) {
      return null;
    }

    const resident = await this.residentRepository.findOne({
      where: { id: residentId, tenantId },
      relations: { apartment: true }, // 👈 Cargamos el apartamento mapeado relacionalmente
    });

    if (!resident) {
      throw new BadRequestException('El residente no pertenece a esta unidad.');
    }

    return resident;
  }

  private async notifyVisit(
    resident: Resident | null,
    visitor: Visitor,
  ): Promise<void> {
    // 🏠 Formateamos la unidad usando la información relacional real
    const unitIdentifier = resident?.apartment 
      ? `${resident.apartment.block} - ${resident.apartment.number}`
      : 'No asignada';

    await this.notificationsService.notifyVisitArrival({
      to: resident?.phone,
      residentName: resident?.fullName,
      unit: unitIdentifier, // 👈 Pasamos el string dinámico construido en vez de la columna borrada
      visitorName: visitor.fullName,
      purpose: visitor.purpose,
      documentId: visitor.documentId,
      email: resident?.email,
    });
  }
}