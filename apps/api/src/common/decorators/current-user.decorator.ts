import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@elearning/shared';

/** Payload placed on `request.user` by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: Role;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
});
