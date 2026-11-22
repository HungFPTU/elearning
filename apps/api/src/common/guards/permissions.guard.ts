import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '@elearning/shared';
import { forbidden } from '../app-exception.js';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator.js';

/** Global guard: enforces @RequirePermission(...). Runs after JwtAuthGuard. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || !required.every((p) => user.permissions.has(p))) {
      throw forbidden('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
    }
    return true;
  }
}
