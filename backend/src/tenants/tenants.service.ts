import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantRoundConfig } from './entities/tenant-round-config.entity';
import { TenantLocationImage } from './entities/tenant-location-image.entity';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,

    @InjectRepository(TenantRoundConfig)
    private readonly roundConfigRepository: Repository<TenantRoundConfig>,

    @InjectRepository(TenantLocationImage)
    private readonly locationImageRepo: Repository<TenantLocationImage>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getImagesByTenant(tenantId: string) {
    return await this.locationImageRepo.find({
      where: { tenant: { id: tenantId } },
      relations: ['checkpoint'], // Si tienes la relación mapeada con el punto de control
    });
  }

  // 2. Asociar una imagen a un punto de control
  async assignImageToCheckpoint(imageId: string, checkpointId: string) {
    const image = await this.locationImageRepo.findOne({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    // Si declaraste la columna 'checkpointId' en tu entidad:
    image.checkpointId = checkpointId ? checkpointId : null;

    return await this.locationImageRepo.save(image);
  }

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
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['roundConfig'],
    });

    if (!tenant) {
      throw new NotFoundException('La unidad residencial no existe.');
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug },
      relations: ['roundConfig'],
    });

    if (!tenant) {
      throw new NotFoundException('La unidad residencial no existe.');
    }

    return tenant;
  }

  async uploadLocationImages(
    tenantId: string,
    files?: Express.Multer.File[],
    description?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han adjuntado imágenes.');
    }

    console.log('================== [DIAGNÓSTICO AVANZADO ROUND CONFIG] ==================');
    console.log('📌 TenantID buscado:', tenantId);

    // 1. Consulta SQL Nativa directa a la tabla tenant_round_configs sin TypeORM ORM magic
    const rawConfigs = await this.roundConfigRepository.query(
      `SELECT * FROM tenant_round_configs WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log('🔎 [SQL NATURA] Registros en "tenant_round_configs" con este tenant_id:', rawConfigs);

    // 2. Consulta SQL Nativa directa a la tabla tenants
    const rawTenant = await this.tenantRepository.query(
      `SELECT id, name, slug FROM tenants WHERE id = $1`,
      [tenantId]
    );
    console.log('🔎 [SQL NATURA] Tenant encontrado en la tabla "tenants":', rawTenant);

    // 3. Buscar la lista de TODOS los roundConfigs para ver si hay IDs repetidos o huérfanos
    const allConfigs = await this.roundConfigRepository.find();
    console.log('📋 Total de configuraciones de ronda en toda la base de datos:', allConfigs.length);
    console.log('📋 Muestra de configuraciones:', JSON.stringify(allConfigs, null, 2));

    // 4. Búsqueda con TypeORM Repository
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['roundConfig'],
    });
    console.log('👤 [TYPEORM] Objeto tenant con su relacion roundConfig:', JSON.stringify(tenant, null, 2));

    const directRoundConfig = await this.roundConfigRepository.findOne({
      where: { tenant: { id: tenantId } },
    });
    console.log('⚙️ [TYPEORM] RoundConfig obtenido por relación inversa:', JSON.stringify(directRoundConfig, null, 2));
    console.log('========================================================================');

    if (!tenant) {
      throw new NotFoundException(`Unidad residencial con ID ${tenantId} no encontrada.`);
    }

    // Usamos el resultado de SQL nativo si está disponible
    const effectiveConfig = rawConfigs[0] || tenant.roundConfig || directRoundConfig;

    if (!effectiveConfig) {
      throw new BadRequestException(
        `La unidad residencial "${tenant.name}" no tiene una configuración de ronda registrada.`,
      );
    }

    // Obtenemos el valor real de puntos configurado
    const maxAllowedPoints = Number(effectiveConfig.total_round_points ?? effectiveConfig.totalRoundPoints);
    console.log('🎯 PUNTOS MÁXIMOS PERMITIDOS DETERMINADOS:', maxAllowedPoints);

    // Contamos cuántas imágenes ya tiene registradas este tenant
    const currentImagesCount = await this.locationImageRepo.count({
      where: { tenant: { id: tenantId } },
    });

    if (currentImagesCount + files.length > maxAllowedPoints) {
      throw new BadRequestException(
        `Límite excedido. Esta unidad residencial tiene un máximo de ${maxAllowedPoints} puntos permitidos y ya cuenta con ${currentImagesCount} imágenes registradas.`,
      );
    }

    const savedImages: TenantLocationImage[] = [];

    for (const [index, file] of files.entries()) {
      try {
        console.log(`Subiendo imagen ${index + 1} a Cloudinary para el tenant ${tenantId}...`);
        const imageUrl = await this.cloudinaryService.uploadImage(file);

        const newImage = this.locationImageRepo.create({
          tenantId,
          imageUrl,
          description: description || file.originalname,
          sequenceOrder: currentImagesCount + index,
        });

        const saved = await this.locationImageRepo.save(newImage);
        savedImages.push(saved);
      } catch (error) {
        console.error(`Error al subir la imagen ${file.originalname}:`, error);
        throw new BadRequestException(`Fallo al subir la imagen ${file.originalname} a Cloudinary.`);
      }
    }

    return {
      message: 'Imágenes de ubicación subidas exitosamente',
      images: savedImages,
    };
  }
}