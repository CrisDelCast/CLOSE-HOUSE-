import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsUUID('4')
  @IsNotEmpty()
  readonly tenantId: string;

  @IsString()
  @IsNotEmpty()
  readonly fullName: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  readonly password: string;

  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN o PORTERO.' })
  readonly role: UserRole;
}
