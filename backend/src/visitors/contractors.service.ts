// src/contractors/contractors.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractorAccess, ContractorStatus } from './entities/contractor-access.entity';
import { CreateContractorAccessDto } from './dto/create-contractor-access.dto';
import { Apartment } from '../properties/entities/apartment.entity';

@Injectable()
export class ContractorsService {
  constructor(
    @InjectRepository(ContractorAccess)
    private readonly contractorRepository: Repository<ContractorAccess>,
    @InjectRepository(Apartment)
    private readonly apartmentRepository: Repository<Apartment>,
  ) {}

  async create(tenantId: string, createDto: CreateContractorAccessDto) {
    // Validar que el apartamento pertenezca al tenant actual por seguridad
    const apartment = await this.apartmentRepository.findOne({
      where: { id: createDto.apartmentId, tenantId },
    });

    if (!apartment) {
      throw new NotFoundException(`El apartamento con ID ${createDto.apartmentId} no fue encontrado.`);
    }

    const contractorAccess = this.contractorRepository.create({
      ...createDto,
      tenantId,
    });

    return await this.contractorRepository.save(contractorAccess);
  }

  async findAllByTenant(tenantId: string) {
    return await this.contractorRepository.find({
      where: { tenantId },
      relations: ['apartment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByApartment(tenantId: string, apartmentId: string) {
    return await this.contractorRepository.find({
      where: { tenantId, apartmentId },
      order: { createdAt: 'DESC' },
    });
  }

  // 👇 Nuevo método para actualizar el estado al hacer clic en el correo
  async updateStatus(id: string, action: ContractorStatus) { // O el tipo literal exacto que use tu entidad
    const access = await this.contractorRepository.findOne({ where: { id } });

    if (!access) {
      return null;
    }

    access.status = action;
    return await this.contractorRepository.save(access);
  }
}