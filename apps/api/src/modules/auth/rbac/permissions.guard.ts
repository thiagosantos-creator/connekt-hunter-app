import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../auth.types.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { hasPermission, type Permission } from './permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    if (permissions.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const role = req.user?.role;

    if (!role || !permissions.every((permission) => hasPermission(role, permission))) {
      throw new ForbiddenException('missing_permission');
    }

    return true;
  }
}
