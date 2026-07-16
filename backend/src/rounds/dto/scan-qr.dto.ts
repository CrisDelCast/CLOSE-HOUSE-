import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ScanQrDto {
  @IsString()
  @IsNotEmpty()
  qrCodeToken: string;

  @IsString()
  @IsOptional()
  notes?: string;
}