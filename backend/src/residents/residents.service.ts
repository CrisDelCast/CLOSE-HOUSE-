import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantsService } from '../tenants/tenants.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { Resident } from './entities/resident.entity';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectRepository(Resident)
    private readonly residentRepository: Repository<Resident>,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(tenantId: string, createResidentDto: CreateResidentDto) {
    await this.tenantsService.findById(tenantId);
    const resident = this.residentRepository.create({
      ...createResidentDto,
      tenantId,
    });

    return this.residentRepository.save(resident);
  }

  findAll(tenantId: string) {
    return this.residentRepository.find({
      where: { tenantId },
      order: { fullName: 'ASC' },
    });
  }
}
