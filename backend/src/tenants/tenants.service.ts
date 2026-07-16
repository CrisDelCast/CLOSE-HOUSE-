import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantRoundConfig } from './entities/tenant-round-config.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,

    @InjectRepository(TenantRoundConfig)
    private readonly roundConfigRepository: Repository<TenantRoundConfig>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const { roundConfig, ...tenantData } = createTenantDto;

    // 1. Verificación estricta del Slug único
    const exists = await this.tenantRepository.findOne({
      where: { slug: tenantData.slug },
    });

    if (exists) {
      throw new ConflictException(
        `Ya existe una unidad residencial con el slug "${tenantData.slug}".`,
      );
    }

    // 2. Creamos la instancia base del Tenant con sus campos de capacidad y admin
    const tenant = this.tenantRepository.create(tenantData);

    // 3. Transformamos el DTO anidado en una instancia válida de la entidad de configuración
    if (roundConfig) {
      tenant.roundConfig = this.roundConfigRepository.create(roundConfig);
    }

    // 4. Guardamos todo en la base de datos (con inserción en cascada activa)
    return this.tenantRepository.save(tenant);
  }

  // Trae todos los tenants e incluye su configuración de rondas si la tienen
  findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({ 
      relations: ['roundConfig'],
      order: { name: 'ASC' } 
    });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ 
      where: { id },
      relations: ['roundConfig']
    });
    
    if (!tenant) {
      throw new NotFoundException('La unidad residencial no existe.');
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ 
      where: { slug },
      relations: ['roundConfig']
    });
    
    if (!tenant) {
      throw new NotFoundException('La unidad residencial no existe.');
    }

    return tenant;
  }
}