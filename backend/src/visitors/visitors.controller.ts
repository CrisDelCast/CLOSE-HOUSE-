import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { DenyVisitorDto } from './dto/deny-visitor.dto';
import { ListVisitorsDto } from './dto/list-visitors.dto';
import { VisitorsService } from './visitors.service';
import { VisitorStatus } from './entities/visitor.entity';

@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  // ==========================================
  // ENDPOINT PÚBLICO PARA RESPUESTA DE CORREO (Sin guards)
  // ==========================================
  @Get('respond')
  async respondVisitorAccess(
    @Query('id') id: string,
    @Query('action') action: 'APPROVED' | 'DENIED',
    @Res() res: Response,
  ) {
    try {
      const newStatus = action === 'APPROVED' ? VisitorStatus.IN : VisitorStatus.DENIED;
      
      // Llamamos al servicio para actualizar el estado
      await this.visitorsService.updateStatus(id, newStatus);

      return res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #0c0c0e; color: #ffffff; min-height: 100vh;">
          <div style="max-width: 500px; margin: 0 auto; background: #16161a; padding: 30px; border-radius: 12px; border: 1px solid #D4AF37;">
            <h2 style="color: ${action === 'APPROVED' ? '#4ade80' : '#dc2626'};">
              ${action === 'APPROVED' ? '✅ ¡Acceso Aprobado Exitosamente!' : '❌ Acceso Denegado'}
            </h2>
            <p style="color: #a3a3a3;">La respuesta ha sido registrada y notificada a portería en tiempo real.</p>
          </div>
        </div>
      `);
    } catch (error) {
      return res.status(400).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #0c0c0e; color: #ffffff; min-height: 100vh;">
          <div style="max-width: 500px; margin: 0 auto; background: #16161a; padding: 30px; border-radius: 12px; border: 1px solid #dc2626;">
            <h2 style="color: #dc2626;">❌ Error al procesar la respuesta</h2>
            <p style="color: #a3a3a3;">El registro ya no existe o el enlace ha expirado.</p>
          </div>
        </div>
      `);
    }
  }

  // ==========================================
  // ENDPOINTS PROTEGIDOS PARA LA INTERFAZ DE PORTERÍA
  // ==========================================
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateVisitorDto) {
    return this.visitorsService.create(tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get()
  findAll(@TenantId() tenantId: string, @Query() query: ListVisitorsDto) {
    return this.visitorsService.findAll(tenantId, query.status, query.residentId);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Patch(':id/check-in')
  checkIn(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload;
    return this.visitorsService.checkIn(tenantId, id, user.sub);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Patch(':id/check-out')
  checkOut(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload;
    return this.visitorsService.checkOut(tenantId, id, user.sub);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Patch(':id/deny')
  deny(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: DenyVisitorDto,
  ) {
    const user = req.user as JwtPayload;
    return this.visitorsService.deny(tenantId, id, user.sub, dto);
  }
}