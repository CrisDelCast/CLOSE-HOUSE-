import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { TenantsService } from '../tenants/tenants.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

interface CreateUserInput {
  tenantId: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

const MANAGED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PORTERO];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantsService: TenantsService,
  ) {}

  private assertManagedRole(role: UserRole): void {
    if (!MANAGED_ROLES.includes(role)) {
      throw new BadRequestException(
        'Solo se pueden gestionar usuarios con rol ADMIN o PORTERO.',
      );
    }
  }

  async create(input: CreateUserInput): Promise<User> {
    this.assertManagedRole(input.role);
    await this.tenantsService.findById(input.tenantId);

    const normalizedEmail = input.email.toLowerCase();
    const exists = await this.userRepository.findOne({
      where: { email: normalizedEmail, tenantId: input.tenantId },
    });

    if (exists) {
      throw new ConflictException(
        'Ya existe un usuario con este correo en la unidad.',
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.userRepository.create({
      tenantId: input.tenantId,
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash,
      role: input.role,
    });

    const saved = await this.userRepository.save(user);
    return this.findById(saved.id);
  }

  async findByTenant(tenantId: string): Promise<User[]> {
    await this.tenantsService.findById(tenantId);

    return this.userRepository.find({
      where: { tenantId },
      relations: { tenant: true },
      order: { fullName: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<User> {
    const user = await this.findById(id);

    if (user.role === UserRole.SUPERADMIN) {
      throw new BadRequestException(
        'Los usuarios SUPERADMIN no se gestionan desde este panel.',
      );
    }

    if (dto.role) {
      this.assertManagedRole(dto.role);
    }

    const targetTenantId = dto.tenantId ?? user.tenantId;

    if (dto.tenantId && dto.tenantId !== user.tenantId) {
      await this.tenantsService.findById(dto.tenantId);
    }

    if (dto.email) {
      const normalizedEmail = dto.email.toLowerCase();
      const emailTaken = await this.userRepository.findOne({
        where: { email: normalizedEmail, tenantId: targetTenantId },
      });

      if (emailTaken && emailTaken.id !== id) {
        throw new ConflictException(
          'Ya existe un usuario con este correo en la unidad seleccionada.',
        );
      }

      user.email = normalizedEmail;
    }

    if (dto.fullName) {
      user.fullName = dto.fullName.trim();
    }

    if (dto.role) {
      user.role = dto.role;
    }

    if (dto.tenantId) {
      user.tenantId = dto.tenantId;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (id === currentUserId && dto.role && dto.role !== user.role) {
      throw new BadRequestException('No puedes cambiar tu propio rol.');
    }

    await this.userRepository.save(user);
    return this.findById(id);
  }

  async remove(id: string, currentUserId: string): Promise<{ message: string }> {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta.');
    }

    const user = await this.findById(id);

    if (user.role === UserRole.SUPERADMIN) {
      throw new BadRequestException(
        'Los usuarios SUPERADMIN no se pueden eliminar desde este panel.',
      );
    }

    await this.userRepository.remove(user);
    return { message: 'Usuario eliminado correctamente.' };
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase(), tenantId },
      relations: { tenant: true },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe.');
    }

    return user;
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  sanitize(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
