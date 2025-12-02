import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantsService } from '../tenants/tenants.service';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterAuthDto) {
    await this.tenantsService.findById(dto.tenantId);
    const user = await this.usersService.create({
      tenantId: dto.tenantId,
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      role: dto.role ?? UserRole.PORTERO,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginAuthDto) {
    const tenant = await this.tenantsService.findBySlug(dto.tenantSlug);
    const user = await this.usersService.findByEmailAndTenant(
      dto.email,
      tenant.id,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await this.usersService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: this.usersService.sanitize(user),
    };
  }
}
