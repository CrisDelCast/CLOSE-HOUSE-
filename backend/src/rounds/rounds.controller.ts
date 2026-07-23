// 📄 src/rounds/rounds.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, ParseUUIDPipe, Param, Query, BadRequestException } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { ScanQrDto } from './dto/scan-qr.dto';

@Controller('rounds')
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  /**
   * 1. Obtener la ronda activa del guardia en curso
   */
  @Get('active')
  async getActiveRound(@Req() req: any) {
    // Reemplaza los strings de prueba por tus UUIDs reales de Neon:
    const userId = req.user?.id ; // 👈 ID de Ana Martínez
    const tenantId = req.user?.tenantId ; // 👈 ID de Altos limonar
    console.log(`[Controller Audit] Usuario: ${userId} | TenantId recibido en la petición: ${tenantId}`);
    return this.roundsService.getActiveRound(userId, tenantId);
  }
  

  /**
   * 2. Iniciar una nueva ronda de vigilancia recibiendo los datos del body
   */
  @Post('start')
  async startRound(@Body() body: { userId: string; tenantId: string; notes?: string }) {
    // Extraemos los campos que envió el frontend, incluyendo las notas opcionales
    const { userId, tenantId, notes } = body;

    // Validamos por seguridad en el backend que lleguen los datos esenciales
    if (!userId || !tenantId) {
      throw new BadRequestException('Se requiere el userId y el tenantId para iniciar la ronda.');
    }

    // Pasamos 'notes' al servicio para que pueda guardarlas o enviarlas por correo
    return this.roundsService.startRound(userId, tenantId, notes);
  }

  /**
   * 3. Registrar un escaneo de código QR
   */
  @Post('scan')
  async scanPoint(
    @Req() req: any,
    @Body() scanQrDto: ScanQrDto,
  ) {
    const userId = req.user?.id; // 👈 ID de Ana Martínez
    const tenantId = req.user?.tenantId; // 👈 ID de Altos limonar

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