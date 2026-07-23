// src/rounds/rounds.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { GuardRound } from './entities/guard-round.entity';
import { GuardRoundCheck } from './entities/guard-round-check.entity';
import { TenantControlPoint } from './entities/tenant-control-point.entity';
import { TenantRoundConfig } from '../tenants/entities/tenant-round-config.entity'; // Ajusta la ruta}
import { ControlPointsService } from './control-points.service';
import { ControlPointsController } from './control-points.controller';
import { NotificationsModule } from '../notifications/notifications.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuardRound,
      GuardRoundCheck,
      TenantControlPoint,
      TenantRoundConfig, // Asegúrate de incluir el de la config de tiempos
    ]),
    NotificationsModule,
  ],
  controllers: [RoundsController,ControlPointsController],
  providers: [RoundsService,ControlPointsService],
  exports: [RoundsService,ControlPointsService],
})
export class RoundsModule {}