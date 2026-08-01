import { Controller, Post, Get, Body, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // ==========================================
  // 🏢 ENDPOINTS DE APARTAMENTOS
  // ==========================================

  @Post('apartments')
  async createApartment(@Body() createApartmentDto: CreateApartmentDto) {
    return this.propertiesService.createApartment(createApartmentDto);
  }

  @Get('tenant/:tenantId/apartments')
  async getApartmentsByTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.propertiesService.findApartmentsByTenant(tenantId);
  }

  // ==========================================
  // 🅿️ ENDPOINTS DE PARQUEADEROS
  // ==========================================

  @Post('parking-spots')
  async createParkingSpot(@Body() createParkingSpotDto: CreateParkingSpotDto) {
    return this.propertiesService.createParkingSpot(createParkingSpotDto);
  }

  @Get('tenant/:tenantId/parking-spots')
  async getParkingSpotsByTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.propertiesService.findParkingSpotsByTenant(tenantId);
  }

  // ==========================================
  // 🚘 ENDPOINTS DE VEHÍCULOS
  // ==========================================

  @Post('vehicles')
  async createVehicle(@Body() createVehicleDto: CreateVehicleDto) {
    return this.propertiesService.createVehicle(createVehicleDto);
  }

  // En tu controlador correspondiente (ej. PropertiesController o VehicleController)
  @Get('vehicles/plate/:plate')
  @UseGuards(JwtAuthGuard)
  async findByPlate(@Req() req: any, @Param('plate') plate: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return await this.propertiesService.findOneByPlateAndTenant(plate, tenantId);
  }

  @Get('residents/document/:document')
  @UseGuards(JwtAuthGuard)
  async findByResidentDocument(@Req() req: any, @Param('document') document: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return await this.propertiesService.findApartmentByResidentDocument(document, tenantId);
  }

  @Post('send-alert')
  async sendAlert(
    @Body()
    body: {
      apartmentId: string;
      subject: string;
      message: string;
      htmlContent?: string;
      isHtml?: boolean;
    },
  ) {
    return await this.propertiesService.sendInstantAlert(
      body.apartmentId,
      body.subject,
      body.message,
      body.htmlContent,
      body.isHtml,
    );
  }

  // ==========================================
  // 👥 ENDPOINTS DE RESIDENTES POR APARTAMENTO
  // ==========================================

  @Get('apartments/:apartmentId/residents')
  @UseGuards(JwtAuthGuard)
  async getResidentsByApartment(@Param('apartmentId', ParseUUIDPipe) apartmentId: string) {
    return await this.propertiesService.findResidentsByApartment(apartmentId);
  }




  
}