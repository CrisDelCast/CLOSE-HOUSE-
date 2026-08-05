/// <reference types="multer" />
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateResidentDto } from './dto/create-resident.dto';
import { ResidentsService } from './residents.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  private resolveActiveTenantId(
    req: Request,
    queryTenantId?: string,
    headerTenantId?: string,
  ): string {
    const payload = req.user as JwtPayload;

    if (payload.role === 'SUPERADMIN') {
      const activeTenantId = queryTenantId || headerTenantId;
      if (!activeTenantId) {
        throw new BadRequestException('Se requiere especificar un conjunto (Tenant ID).');
      }
      return activeTenantId;
    }

    if (!payload.tenantId) {
      throw new BadRequestException('No se encontró el conjunto del usuario.');
    }

    return payload.tenantId;
  }

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  create(
    @Req() req: Request,
    @Query('tenantId') queryTenantId: string | undefined,
    @TenantId() tenantId: string | undefined,
    @Body() createResidentDto: CreateResidentDto,
  ) {
    const activeTenantId = this.resolveActiveTenantId(req, queryTenantId, tenantId);
    return this.residentsService.create(activeTenantId, createResidentDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN')
  findAll(
    @Req() req: Request,
    @Query('tenantId') queryTenantId?: string,
    @TenantId() tenantId?: string,
  ) {
    const activeTenantId = this.resolveActiveTenantId(req, queryTenantId, tenantId);
    return this.residentsService.findAll(activeTenantId);
  }

  @Post('bulk-upload')
  @Roles('ADMIN', 'SUPERADMIN')
  @UseInterceptors(FileInterceptor('file'))
  bulkUpload(
    @Req() req: Request,
    @Query('tenantId') queryTenantId: string | undefined,
    @TenantId() tenantId: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const activeTenantId = this.resolveActiveTenantId(req, queryTenantId, tenantId);

    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo Excel (.xlsx).');
    }

    return this.residentsService.processBulkUpload(activeTenantId, file);
  }
}
