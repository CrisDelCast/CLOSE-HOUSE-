import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

import { Apartment } from './entities/apartment.entity';
import { ParkingSpot } from './entities/parking-spot.entity';
import { Vehicle } from './entities/vehicle.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // 🚀 Registramos las 3 entidades bajo el mismo módulo
    TypeOrmModule.forFeature([Apartment, ParkingSpot, Vehicle]),NotificationsModule
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService], // Por si necesitas usarlo en el módulo de rondas o residentes
})
export class PropertiesModule {}    