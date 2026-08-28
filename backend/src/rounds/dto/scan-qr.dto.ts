import { IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class ScanQrDto {
  @IsString()
  @IsNotEmpty()
  qrCodeToken: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsIn(['INGRESO', 'SALIDA'])
  readonly action?: 'INGRESO' | 'SALIDA';
}