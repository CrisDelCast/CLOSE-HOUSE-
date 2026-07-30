import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { GeneralReportType } from '../entities/general-report.entity';

export class CreateGeneralReportDto {
  @IsEnum(GeneralReportType)
  reportType: GeneralReportType;

  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  image?: unknown;
}
