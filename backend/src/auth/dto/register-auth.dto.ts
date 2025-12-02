import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterAuthDto {
  @IsString()
  @IsNotEmpty()
  readonly tenantId: string;

  @IsString()
  @IsNotEmpty()
  readonly fullName: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(6)
  readonly password: string;

  @IsOptional()
  @IsEnum(UserRole)
  readonly role?: UserRole;
}
