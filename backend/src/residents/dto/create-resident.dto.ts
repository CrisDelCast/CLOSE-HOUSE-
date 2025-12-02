import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly unitNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  readonly vehiclePlate?: string;
}
