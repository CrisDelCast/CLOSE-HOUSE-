/// <reference types="multer" />
import { 
  Body, 
  Controller, 
  Get, 
  Post, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateResidentDto } from './dto/create-resident.dto';
import { ResidentsService } from './residents.service';
import { RolesGuard } from '../auth/guards/roles.guard'; 
import { Roles } from '../auth/decorators/roles.decorator';



@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  // 1. Crear residente de forma individual (Formulario web manual)
  @Post()
  @Roles('ADMIN')
  create(
    @TenantId() tenantId: string,
    @Body() createResidentDto: CreateResidentDto,
  ) {
    return this.residentsService.create(tenantId, createResidentDto);
  }

  // 2. Obtener todos los residentes del conjunto actual
  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.residentsService.findAll(tenantId);
  }

  // 3. ✨ NUEVO ENDPOINT: Carga masiva mediante archivo Excel
  // Reutiliza tu @TenantId() para saber a qué conjunto meter los residentes del Excel de forma ultra segura
  @Post('bulk-upload')
  @Roles('ADMIN', 'SUPERADMIN') // Permitimos que tanto el Admin local como el SuperAdmin global ejecuten la carga
  @UseInterceptors(FileInterceptor('file'))
  async uploadBulk(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Por favor, selecciona un archivo Excel.');
    }
    
    // Validación de extensiones permitidas
    if (!file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      throw new BadRequestException(
        'Formato de archivo no válido. Debe ser un archivo Excel (.xlsx, .xls) o un CSV.'
      );
    }

    return this.residentsService.processBulkUpload(tenantId, file);
  }
}