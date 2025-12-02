import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TENANT_HEADER } from '../constants/tenant.constant';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const headerValue = request.headers[TENANT_HEADER] as string | string[];
    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
  },
);
