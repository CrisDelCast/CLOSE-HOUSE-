// 📄 src/rounds/rounds.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
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
    const userId = req.user?.id || '41ec4b5e-1144-464a-aed9-da5de9c55f1f'; // 👈 ID de Ana Martínez
    const tenantId = req.user?.tenantId || 'ce03859a-427b-4835-be42-204bb955b1ac'; // 👈 ID de Altos limonar

    return this.roundsService.getActiveRound(userId, tenantId);
  }

  /**
   * 2. Iniciar una nueva ronda de vigilancia
   */
  @Post('start')
  async startRound(@Req() req: any) {
    const userId = req.user?.id || '41ec4b5e-1144-464a-aed9-da5de9c55f1f'; // 👈 ID de Ana Martínez
    const tenantId = req.user?.tenantId || 'ce03859a-427b-4835-be42-204bb955b1ac'; // 👈 ID de Altos limonar

    return this.roundsService.startRound(userId, tenantId);
  }

  /**
   * 3. Registrar un escaneo de código QR
   */
  @Post('scan')
  async scanPoint(
    @Req() req: any,
    @Body() scanQrDto: ScanQrDto,
  ) {
    const userId = req.user?.id || '41ec4b5e-1144-464a-aed9-da5de9c55f1f'; // 👈 ID de Ana Martínez
    const tenantId = req.user?.tenantId || 'ce03859a-427b-4835-be42-204bb955b1ac'; // 👈 ID de Altos limonar

    return this.roundsService.scanPoint(userId, tenantId, scanQrDto);
  }
}