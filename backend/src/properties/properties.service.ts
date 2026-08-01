import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Apartment } from './entities/apartment.entity';
import { ParkingSpot } from './entities/parking-spot.entity';
import { Vehicle } from './entities/vehicle.entity';

import { CreateApartmentDto } from './dto/create-apartment.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Resident } from '../residents/entities/resident.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Apartment)
    private readonly apartmentRepo: Repository<Apartment>,
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
  ) {}

  // ==========================================
  // 🏢 LÓGICA DE APARTAMENTOS
  // ==========================================

  async createApartment(dto: CreateApartmentDto): Promise<Apartment> {
    const exists = await this.apartmentRepo.findOne({
      where: { tenantId: dto.tenantId, number: dto.number, block: dto.block || null },
    });
    if (exists) {
      throw new BadRequestException(`El apartamento ${dto.number} ya está registrado en este conjunto.`);
    }

    const apartment = this.apartmentRepo.create(dto);
    return this.apartmentRepo.save(apartment);
  }

  async findApartmentsByTenant(tenantId: string): Promise<Apartment[]> {
    return this.apartmentRepo.find({ 
      where: { tenantId },
      // 👇 Inyectamos el árbol relacional completo para alimentar la UI
      relations: [
        'residents',                 // Trae la lista de personas que viven allí
        'parkingSpots',              // Trae los espacios asignados a este apto
        'parkingSpots.vehicles'      // Trae los vehículos parqueados en esos espacios
      ],
      // Opcional: Ordenamos por bloque y número para que se vea impecable en el grid
      order: {
        block: 'ASC',
        number: 'ASC',
      } as any
    });
  }

  // ==========================================
  // 🅿️ LÓGICA DE PARQUEADEROS
  // ==========================================

  async createParkingSpot(dto: CreateParkingSpotDto): Promise<ParkingSpot> {
    const exists = await this.parkingSpotRepo.findOne({
      where: { tenantId: dto.tenantId, number: dto.number },
    });
    if (exists) {
      throw new BadRequestException(`El parqueadero número ${dto.number} ya está registrado.`);
    }

    const spot = this.parkingSpotRepo.create(dto);
    return this.parkingSpotRepo.save(spot);
  }

  async findParkingSpotsByTenant(tenantId: string): Promise<ParkingSpot[]> {
    return this.parkingSpotRepo.find({
      where: { tenantId },
      relations: ['apartment'], // Para saber a qué apartamento está asignado cada puesto
    });
  }

  // ==========================================
  // 🚘 LÓGICA DE VEHÍCULOS
  // ==========================================

  async createVehicle(dto: CreateVehicleDto): Promise<Vehicle> {
    const formattedPlate = dto.plate.toUpperCase().trim();

    const exists = await this.vehicleRepo.findOne({
      where: { plate: formattedPlate },
    });
    if (exists) {
      throw new BadRequestException(`El vehículo con placa ${formattedPlate} ya existe en el sistema.`);
    }

    const vehicle = this.vehicleRepo.create({
      ...dto,
      plate: formattedPlate,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async findVehicleByPlate(plate: string): Promise<Vehicle> {
    const formattedPlate = plate.toUpperCase().trim();
    const vehicle = await this.vehicleRepo.findOne({
      where: { plate: formattedPlate },
      relations: ['parkingSpot', 'parkingSpot.apartment'], // Trae el árbol completo para el rondero
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehículo con placa ${formattedPlate} no encontrado.`);
    }
    return vehicle;
  }

  // ==========================================
  // 🔍 BÚSQUEDA SEGURA DE VEHÍCULOS POR TENANT
  // ==========================================

  async findOneByPlateAndTenant(plate: string, tenantId: string): Promise<Vehicle> {
    const formattedPlate = plate.toUpperCase().trim();

    const vehicle = await this.vehicleRepo.findOne({
      where: [
        { plate: formattedPlate, tenantId },
        {
          plate: formattedPlate,
          parkingSpot: { apartment: { tenantId } },
        },
      ],
      relations: ['parkingSpot', 'parkingSpot.apartment'],
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehículo con placa ${formattedPlate} no encontrado en este conjunto.`);
    }

    return vehicle;
  }

  // ==========================================
  // 🔍 BÚSQUEDA DE APARTAMENTO POR CÉDULA DEL RESIDENTE Y TENANT
  // ==========================================

  async findApartmentByResidentDocument(document: string, tenantId: string): Promise<Apartment> {
    const cleanDoc = document.trim();

    const apartment = await this.apartmentRepo
      .createQueryBuilder('apartment')
      .leftJoinAndSelect('apartment.residents', 'resident')
      .leftJoinAndSelect('apartment.parkingSpots', 'parkingSpot')
      .leftJoinAndSelect('parkingSpot.vehicles', 'vehicle')
      .where('apartment.tenantId = :tenantId', { tenantId })
      // 🛠️ Usamos 'resident.documentId' que es como se llama el campo en la entidad Resident
      .andWhere('resident.documentId = :document', { document: cleanDoc }) 
      .getOne();

    if (!apartment) {
      throw new NotFoundException(`No se encontró ningún apartamento asociado a la cédula ${cleanDoc} en este conjunto.`);
    }

    return apartment;
  }

  async sendInstantAlert(
    apartmentId: string, 
    subject: string, 
    message: string, 
    htmlContent?: string, 
    isHtml?: boolean
  ) {
    // 1. Buscamos el apartamento y sus residentes usando el repositorio correcto
    const apartment = await this.apartmentRepo.findOne({
      where: { id: apartmentId },
      relations: ['residents'],
    });

    if (!apartment || !apartment.residents || apartment.residents.length === 0) {
      throw new NotFoundException('No se encontraron residentes asociados a este apartamento.');
    }
    const validResidents = apartment.residents
      .filter(resident => resident.email && resident.fullName)
      .map(resident => ({
        email: resident.email as string,
        fullName: resident.fullName,
      }));

    if (validResidents.length === 0) {
      throw new NotFoundException('No hay residentes con correo electrónico válido en este apartamento.');
    }

    // 2. Pasamos los nuevos parámetros opcionales al servicio de notificaciones
    await this.notificationsService.notifyApartmentResidents(
      validResidents,
      subject,
      message,
      htmlContent,
      isHtml,
    );

    return { message: 'Notificación enviada exitosamente a los residentes.' };
  }

  async findResidentsByApartment(apartmentId: string) {
    return await this.residentRepository.find({
      where: { 
        apartment: { 
          id: apartmentId 
        } 
      },
    });
  }

 


  
}