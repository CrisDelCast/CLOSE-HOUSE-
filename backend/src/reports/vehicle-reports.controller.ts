// 📄 src/vehicle-reports/vehicle-reports.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VehicleReportsService } from './vehicle-reports.service';
import { CreateVehicleReportDto } from './dto/create-vehicle-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('vehicle-reports')
@UseGuards(JwtAuthGuard)
export class VehicleReportsController {
  constructor(private readonly vehicleReportsService: VehicleReportsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Req() req: any,
    @Body() createDto: CreateVehicleReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id']; 
    const userId = req.user?.sub || req.user?.id; 

    if (createDto.image) {
        delete createDto.image;
    }

    return await this.vehicleReportsService.create(tenantId, userId, createDto, file);
  }

  // 🔄 NUEVO: Endpoint PUT para actualizar un reporte existente (Minuta)
  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: CreateVehicleReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const userId = req.user?.sub || req.user?.id;

    if (updateDto.image) {
        delete updateDto.image;
    }

    return await this.vehicleReportsService.update(tenantId, id, userId, updateDto, file);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return await this.vehicleReportsService.findAllByTenant(tenantId);
  }
}