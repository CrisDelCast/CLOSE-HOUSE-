import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
}
