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

    this.notifyVisit(resident, savedVisitor).catch((error) => {
      this.logger.warn(
        `La visita se creó pero falló la notificación: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    return savedVisitor;
  }

  findAll(tenantId: string, status?: VisitorStatus) {
    return this.visitorRepository.find({
      where: {
        tenantId,
        ...(status ? { status } : {}),
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
      relations: { resident: true },
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
    await this.notificationsService.notifyVisitArrival({
      to: resident?.phone,
      residentName: resident?.fullName,
      unit: resident?.unitNumber,
      visitorName: visitor.fullName,
      purpose: visitor.purpose,
      documentId: visitor.documentId,
      email: resident?.email,
    });
  }
}
