import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  // NestJS: Controller
  @Get(':tenantId/location-images')
  async getLocationImages(@Param('tenantId') tenantId: string) {
    return await this.tenantsService.getImagesByTenant(tenantId);
  }
  @Patch('location-images/:imageId/checkpoint')
  async assignImageToCheckpoint(
    @Param('imageId') imageId: string,
    @Body('checkpointId') checkpointId: string,
  ) {
    return await this.tenantsService.assignImageToCheckpoint(imageId, checkpointId);
  }

  @Post('location-images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadLocationImages(
    @Req() req: any,
    @Query('tenantId') queryTenantId: string,
    @Body() body: { description?: string },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Le damos prioridad al tenantId que viene explícito en la URL desde el cliente
    const targetTenantId = queryTenantId || req.user?.tenantId;

    console.log('🎯 SUBIENDO IMÁGENES AL TENANT:', targetTenantId);

    return await this.tenantsService.uploadLocationImages(targetTenantId, files, body?.description);
  }
}
