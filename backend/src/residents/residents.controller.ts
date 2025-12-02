import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateResidentDto } from './dto/create-resident.dto';
import { ResidentsService } from './residents.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post()
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
