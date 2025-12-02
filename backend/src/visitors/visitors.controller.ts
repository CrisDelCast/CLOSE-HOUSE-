import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { DenyVisitorDto } from './dto/deny-visitor.dto';
import { ListVisitorsDto } from './dto/list-visitors.dto';
import { VisitorsService } from './visitors.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateVisitorDto) {
    return this.visitorsService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() query: ListVisitorsDto) {
    return this.visitorsService.findAll(tenantId, query.status);
  }

  @Patch(':id/check-in')
  checkIn(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload;
    return this.visitorsService.checkIn(tenantId, id, user.sub);
  }

  @Patch(':id/check-out')
  checkOut(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload;
    return this.visitorsService.checkOut(tenantId, id, user.sub);
  }

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
