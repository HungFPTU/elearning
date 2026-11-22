import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@elearning/shared';
import { RolesGuard } from './roles.guard.js';

const contextFor = (user?: { id: string; role: Role }) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it('allows routes without @Roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ id: 'u1', role: Role.STUDENT }))).toBe(true);
  });

  it('allows a user with a required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(contextFor({ id: 'u1', role: Role.ADMIN }))).toBe(true);
  });

  it('rejects a user without the required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.INSTRUCTOR]);
    expect(() => guard.canActivate(contextFor({ id: 'u1', role: Role.STUDENT }))).toThrow('Bạn không có quyền');
  });
});
