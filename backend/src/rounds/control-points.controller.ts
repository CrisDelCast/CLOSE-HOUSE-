  // src/rounds/control-points.controller.ts
  import { Controller, Get, Post, Body, Param } from '@nestjs/common';
  import { ControlPointsService } from './control-points.service';

  @Controller('control-points')
  export class ControlPointsController {
    constructor(private readonly controlPointsService: ControlPointsService) {}

    /**
     * Obtiene los puntos de control de un Tenant específico
     * GET /api/control-points/tenant/:tenantId
     */
    @Get('tenant/:tenantId')
    async getPointsByTenant(@Param('tenantId') tenantId: string) {
      return this.controlPointsService.findAllByTenant(tenantId);
    }

    /**
     * Crea un nuevo punto de control físico
     * POST /api/control-points
     */
    @Post()
    async createPoint(
      @Body() body: { name: string; sequenceOrder: number; tenantId: string },
    ) {
      return this.controlPointsService.createPoint(
        body.name,
        body.sequenceOrder,
        body.tenantId,
      );
    }
  }