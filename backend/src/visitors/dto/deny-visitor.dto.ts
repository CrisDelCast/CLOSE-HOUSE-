import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DenyVisitorDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly notes?: string;
}
