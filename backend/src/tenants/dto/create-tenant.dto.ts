import { 
  IsNotEmpty, 
  IsString, 
  Matches, 
  IsNumber, 
  IsEmail, 
  IsOptional, 
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

// Sub-DTO interno para la configuración opcional de rondas
class RoundConfigDto {
  @IsNumber()
  @IsNotEmpty()
  readonly timePerPoint: number;

  @IsNumber()
  @IsNotEmpty()
  readonly timeBetweenPoints: number;

  @IsString()
  @IsNotEmpty()
  readonly vehicleControlSchedule: string; // Ej: "22:00-06:00"
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener minúsculas, números y guiones.',
  })
  readonly slug: string;

  // 📞 Configuración y capacidad
  @IsString()
  @IsNotEmpty()
  readonly phoneCode: string; // Ej: "+57"

  @IsNumber()
  @IsNotEmpty()
  readonly totalUnits: number; // Apartamentos o locales

  @IsNumber()
  @IsNotEmpty()
  readonly totalParkingSlots: number; // Parqueaderos

  @IsString()
  @IsNotEmpty()
  readonly scheduleType: string; // Ej: "24/7", "Diurno"

  // 👥 Datos del Administrador del Conjunto
  @IsString()
  @IsNotEmpty()
  readonly adminName: string;

  @IsEmail({}, { message: 'El correo del administrador no es válido.' })
  @IsNotEmpty()
  readonly adminEmail: string;

  @IsString()
  @IsNotEmpty()
  readonly adminPhone: string;

  // 📄 Normativas de convivencia (Texto largo)
  @IsString()
  @IsOptional()
  readonly rulesText?: string;

  // 🔄 Módulo de Rondas Opcional
  // Si viene en el JSON, se valida estrictamente con las reglas de RoundConfigDto
  @IsOptional()
  @ValidateNested()
  @Type(() => RoundConfigDto)
  readonly roundConfig?: RoundConfigDto;
}