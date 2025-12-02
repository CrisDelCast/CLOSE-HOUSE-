import { IsEnum, IsOptional } from 'class-validator';
import { VisitorStatus } from '../entities/visitor.entity';

export class ListVisitorsDto {
  @IsOptional()
  @IsEnum(VisitorStatus)
  readonly status?: VisitorStatus;
}
