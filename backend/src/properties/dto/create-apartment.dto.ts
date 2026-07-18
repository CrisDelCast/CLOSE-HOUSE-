import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateApartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de apartamento es obligatorio.' })
  number: string; // Ej: "302"

  @IsString()
  @IsOptional()
  block?: string; // Ej: "Torre B" o "Interior 1"

  @IsUUID('4', { message: 'El tenantId debe ser un UUID válido.' })
  @IsNotEmpty()
  tenantId: string;
}