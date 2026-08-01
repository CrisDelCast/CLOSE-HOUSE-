import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { typeOrmConfig } from './config/typeorm.config';
import { ResidentsModule } from './residents/residents.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { VisitorsModule } from './visitors/visitors.module';
import { ExamsModule } from './exams/exams.module';
import { RoundsModule } from './rounds/rounds.module';
import { PropertiesModule } from './properties/properties.module';
import { VehicleReportsModule } from './reports/vehicle-reports.module';
import { GeneralReportsModule } from './reports/general-reports.module';
import { ContractorsModule } from './visitors/contractors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    TenantsModule,
    ResidentsModule,
    UsersModule,
    AuthModule,
    VisitorsModule,
    ExamsModule,
    RoundsModule,
    PropertiesModule,
    VehicleReportsModule,
    GeneralReportsModule,
    ContractorsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
