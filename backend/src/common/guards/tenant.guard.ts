import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { TENANT_HEADER } from '../constants/tenant.constant';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = request.user as JwtPayload | undefined;

    if (payload && payload.role === 'SUPERADMIN') {
      return true;
      
    }

    // Permitir obtener el tenantId ya sea del header o directamente de los parámetros de la ruta (:tenantId)
    const headerValue = request.headers[TENANT_HEADER] as string | string[];
    const headerTenantId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const routeTenantId = request.params?.tenantId;

    const tenantId = routeTenantId || headerTenantId;

    if (!tenantId) {
      throw new BadRequestException(
        `Debe enviar el identificador de la unidad residencial.`,
      );
    }

    if (payload && payload.tenantId !== tenantId) {
      throw new ForbiddenException(
        'El token no corresponde a la unidad residencial especificada.',
      );
    }

    return true;
  }
}