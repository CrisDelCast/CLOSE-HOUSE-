import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantRoundConfig } from './entities/tenant-round-config.entity';
import { TenantLocationImage } from './entities/tenant-location-image.entity';
import { CloudinaryModule } from '../common/services/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantRoundConfig, TenantLocationImage]),CloudinaryModule,],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
