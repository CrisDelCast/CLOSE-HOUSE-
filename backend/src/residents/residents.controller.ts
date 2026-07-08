import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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

  @Post()
  @Roles('ADMIN')
  create(
    @TenantId() tenantId: string,
    @Body() createResidentDto: CreateResidentDto,
  ) {
    return this.residentsService.create(tenantId, createResidentDto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.residentsService.findAll(tenantId);
  }
}
