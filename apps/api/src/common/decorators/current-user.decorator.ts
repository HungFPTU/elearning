import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PermissionKey, Role } from '@elearning/shared';

/** Placed on `request.user` by JwtAuthGuard. Loaded from the DB (cached), never trusted from the token. */
export interface AuthUser {
  id: string;
  role: Role;
  permissions: ReadonlySet<PermissionKey>;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
});
