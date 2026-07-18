import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateParkingSpotDto {
  @IsString()
  @IsNotEmpty({ message: 'El número o identificador del parqueadero es requerido.' })
  number: string; // Ej: "P-102"

  @IsUUID('4', { message: 'El tenantId debe ser un UUID válido.' })
  @IsNotEmpty()
  tenantId: string;

  @IsUUID('4', { message: 'El apartmentId debe ser un UUID válido.' })
  @IsOptional()
  apartmentId?: string; // Opcional por si hay parqueaderos de visitantes sin asignar
}