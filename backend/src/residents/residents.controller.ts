/// <reference types="multer" />
import { 
  Body, 
  Controller, 
  Get, 
  Post, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException,
  Query // 👈 Importamos Query para que el SuperAdmin pueda filtrar por conjunto
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

  // 1. Crear residente de forma individual
  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  create(
    @TenantId() tenantId: string,
    @Body() createResidentDto: CreateResidentDto,
  ) {
    // Nota: Si es SUPERADMIN, asegúrate en el frontend de enviarle el tenantId del conjunto seleccionado,
    // o maneja en el servicio que si el tenantId del decorador es null, lo tome del DTO.
    return this.residentsService.create(tenantId, createResidentDto);
  }

  // 2. Obtener todos los residentes (¡Corregido!)
 // 2. Obtener todos los residentes
 @Get()
 @Roles('ADMIN', 'SUPERADMIN')
 findAll(
   @Query('tenantId') queryTenantId?: string, // 👈 Pasamos el query al primer lugar
   @TenantId() tenantId?: string // 👈 Lo hacemos opcional con el "?"
 ) {
   // 💡 IMPORTANTE: Evaluamos PRIMERO el queryTenantId. 
   // Si viene (como en el caso del SuperAdmin), lo usamos directamente.
   // Si no viene, usamos el tenantId inyectado automáticamente para los ADMIN normales.
   const activeTenantId = queryTenantId || tenantId;

   if (!activeTenantId) {
     throw new BadRequestException('Se requiere especificar un conjunto (Tenant ID).');
   }

   return this.residentsService.findAll(activeTenantId);
 }
}