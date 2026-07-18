import { Controller, Post, Get, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

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

  @Get('vehicles/plate/:plate')
  async getVehicleByPlate(@Param('plate') plate: string) {
    return this.propertiesService.findVehicleByPlate(plate);
  }
}