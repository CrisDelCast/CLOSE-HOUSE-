import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateResidentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  readonly documentId: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  readonly email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly phone?: string;

  // 👈 Ahora es obligatorio y es la única vía para asociarlo a su inmueble
  @IsNotEmpty()
  @IsUUID()
  readonly apartmentId: string; 
}