// 📄 src/rounds/rounds.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, ParseUUIDPipe, Param, Query, BadRequestException } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { ScanQrDto } from './dto/scan-qr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('rounds')
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  
  /**
   * 1. Obtener la ronda activa del guardia en curso
   */
  @Get('active')
  @UseGuards(JwtAuthGuard) // 👈 FALTABA ESTO
  async getActiveRound(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id; // Usar sub o id según tu JWT
    const tenantId = req.user?.tenantId;
    
    console.log(`[Controller Audit] Usuario: ${userId} | TenantId recibido en la petición: ${tenantId}`);
    
    if (!userId || !tenantId) {
      throw new BadRequestException('No se pudo identificar la sesión del usuario.');
    }

    return this.roundsService.getActiveRound(userId, tenantId);
  }
  
  /**
   * 2. Iniciar una nueva ronda de vigilancia usando la sesión JWT
   */
  @Post('start')
  @UseGuards(JwtAuthGuard) // 👈 Obligatorio para activar la validación del token
  async startRound(
    @Req() req: any,
    @Body() body?: { notes?: string } // Opcional: solo si envías notas desde el frontend
  ) {
    // Extraemos de la sesión activa decodificada por el JWT
    const userId = req.user.sub || req.user.id;
    const tenantId = req.user.tenantId;

    // Validamos por seguridad en el backend que el token contenga los datos
    if (!userId || !tenantId) {
      throw new BadRequestException('No se pudo identificar la sesión del usuario para iniciar la ronda.');
    }

    const notes = body?.notes;

    // Pasamos los datos extraídos del JWT al servicio
    return this.roundsService.startRound(userId, tenantId, notes);
  }
 
  /**
   * 3. Registrar un escaneo de código QR
   */
  @Post('scan')
  @UseGuards(JwtAuthGuard) // 👈 Obligatorio para activar la validación del token
  async scanPoint(
    @Req() req: any,
    @Body() scanQrDto: ScanQrDto,
  ) {
    // Extraemos de la sesión activa decodificada por el JWT
    const userId = req.user.sub || req.user.id;
    const tenantId = req.user.tenantId;

    if (!userId || !tenantId) {
      throw new BadRequestException('No se pudo identificar la sesión del usuario.');
    }

    return this.roundsService.scanPoint(userId, tenantId, scanQrDto);
  }



  @Get('tenant/:tenantId')
  async getCompletedRoundsByTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.roundsService.findCompletedByTenant(tenantId, { startDate, endDate });
  }
}