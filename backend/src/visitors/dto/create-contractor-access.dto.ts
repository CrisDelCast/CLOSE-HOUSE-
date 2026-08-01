// src/contractors/dto/create-contractor-access.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsEnum } from 'class-validator';
import { ContractorStatus } from '../entities/contractor-access.entity';

export class CreateContractorAccessDto {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsUUID()
  @IsNotEmpty()
  apartmentId: string;

  @IsString()
  @IsNotEmpty()
  procedureType: string;

  @IsEnum(ContractorStatus)
  status: ContractorStatus;
}