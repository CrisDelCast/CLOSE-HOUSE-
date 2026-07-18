import { IsString, IsNotEmpty, IsOptional, IsUUID, Length, Matches } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'La placa es obligatoria.' })
  // Forzamos un formato estándar alfanumérico de entre 5 y 10 caracteres (p.ej. Colombia o Latam)
  @Length(5, 10, { message: 'La placa debe tener entre 5 y 10 caracteres.' })
  @Matches(/^[A-Z0-9-]+$/i, { message: 'La placa solo puede contener letras, números y guiones.' })
  plate: string;

  @IsString()
  @IsOptional()
  brand?: string; // Ej: "Mazda"

  @IsString()
  @IsOptional()
  color?: string; // Ej: "Gris"

  @IsUUID('4', { message: 'El tenantId debe ser un UUID válido.' })
  @IsNotEmpty()
  tenantId: string;

  @IsUUID('4', { message: 'El parkingSpotId debe ser un UUID válido.' })
  @IsOptional()
  parkingSpotId?: string; // Se asigna al parqueadero que creamos arriba
}