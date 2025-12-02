import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

interface CreateUserInput {
  tenantId: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
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
