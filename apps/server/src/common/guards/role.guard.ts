import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_ROLES_KEY } from '../decorators/require-roles.decorator';
import { AuthenticatedRequest } from '../types/authenticated-user.type';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(REQUIRE_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException({
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const grantedRoles = new Set(request.user.roles.map((role) => role.code));
    const hasRole = requiredRoles.some((role) => grantedRoles.has(role));

    if (!hasRole) {
      throw new ForbiddenException({
        code: 'AUTH_FORBIDDEN',
        message: 'Role denied',
      });
    }

    return true;
  }
}
