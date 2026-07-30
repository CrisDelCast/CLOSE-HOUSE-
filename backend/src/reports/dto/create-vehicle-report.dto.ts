import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { VehicleReportStatus } from '../entities/vehicle-status-report.entity';

export class CreateVehicleReportDto {
  @IsUUID()
  vehicleId: string;

  @IsEnum(VehicleReportStatus)
  status: VehicleReportStatus;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  image?: any;
}