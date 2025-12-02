import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly documentType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  readonly documentId: string;

  @IsOptional()
  @IsUUID()
  readonly residentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  readonly vehiclePlate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly purpose?: string;

  @IsOptional()
  @IsString()
  readonly notes?: string;
}
