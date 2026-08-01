// src/contractors/contractors.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Req,
    UsePipes,
    ValidationPipe,
    Param,
    Query,
    Res,
    NotFoundException,
  } from '@nestjs/common';
  import { Response } from 'express';
  import { ContractorsService } from './contractors.service';
  import { CreateContractorAccessDto } from './dto/create-contractor-access.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContractorStatus } from './entities/contractor-access.entity';
  
  @Controller('contractors-access')
  export class ContractorsController {
    constructor(private readonly contractorsService: ContractorsService) {}
  
    // 🛡️ Endpoints protegidos por JWT (para la interfaz de portería)
    @Post()
    @UseGuards(JwtAuthGuard)
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async create(@Req() req: any, @Body() createDto: CreateContractorAccessDto) {
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      return await this.contractorsService.create(tenantId, createDto);
    }
  
    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Req() req: any) {
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      return await this.contractorsService.findAllByTenant(tenantId);
    }

    @Get('apartment/:apartmentId')
    @UseGuards(JwtAuthGuard)
    async findByApartment(@Req() req: any, @Param('apartmentId') apartmentId: string) {
      const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
      return await this.contractorsService.findByApartment(tenantId, apartmentId);
    }

    // 🔓 ENDPOINT PÚBLICO: Este NO lleva @UseGuards para que el residente pueda aprobar desde el correo
    @Get('respond')
    async handleEmailResponse(
      @Query('id') accessId: string,
      @Query('action') action: ContractorStatus,
      @Res() res: Response,
    ) {
      try {
        // Llama a tu servicio para actualizar el estado del acceso
        const updated = await this.contractorsService.updateStatus(accessId, action);

        if (!updated) {
          return res.status(404).send('<h1>Solicitud no encontrada o enlace caducado.</h1>');
        }

        const isApproved = action === 'APPROVED';
        const title = isApproved ? '¡Acceso Aprobado!' : 'Acceso Rechazado';
        const color = isApproved ? '#16a34a' : '#dc2626';
        const message = isApproved 
          ? 'Has autorizado el ingreso de este contratista exitosamente. Ya puedes cerrar esta pestaña.' 
          : 'Has rechazado la solicitud de ingreso. Ya puedes cerrar esta pestaña.';

        return res.send(`
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f5; height: 100vh; box-sizing: border-box;">
            <div style="background: white; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid ${color};">
              <h1 style="color: ${color}; margin-top: 0;">${title}</h1>
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.5;">${message}</p>
              <p style="color: #a1a1aa; font-size: 12px; margin-top: 30px;">Sistema de Control de Portería</p>
            </div>
          </div>
        `);
      } catch (error) {
        return res.status(500).send('<h1>Ocurrió un error al procesar tu respuesta.</h1>');
      }
    }
  }