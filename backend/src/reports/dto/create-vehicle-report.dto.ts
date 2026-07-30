import { IsEnum, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { VehicleReportStatus } from '../entities/vehicle-status-report.entity';

export enum ChecklistItemStatus {
  BIEN = 'bien',
  REGULAR = 'regular',
  MAL = 'mal',
}

// Sub-estructura opcional si quieres permitir observaciones por cada parte en un solo DTO
class PartDetailDto {
  @IsEnum(ChecklistItemStatus)
  status: ChecklistItemStatus;

  @IsOptional()
  @IsString()
  observations?: string;
}

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

  


  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (err) {
        return value; // Retorna el valor original si falla para que el validador lance el error correcto
      }
    }
    return value;
  })
  @IsObject()
  checklist: Record<string, any>;
}