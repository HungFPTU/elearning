import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '@elearning/shared';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { PermissionsGuard } from './permissions.guard.js';

const userWith = (...permissions: PermissionKey[]): AuthUser => ({ id: 'u1', role: 'USER', permissions: new Set(permissions) });

const contextFor = (user?: AuthUser) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  it('allows routes without @RequirePermission', () => {
    vi.spyOn(reflector, 'getAllAndMerge').mockReturnValue([]);
    expect(guard.canActivate(contextFor(userWith()))).toBe(true);
  });

  it('allows a user who has every required permission', () => {
    vi.spyOn(reflector, 'getAllAndMerge').mockReturnValue(['admin.access', 'user.read']);
    expect(guard.canActivate(contextFor(userWith('admin.access', 'user.read', 'audit.read')))).toBe(true);
  });

  it('rejects a user missing one of the required permissions', () => {
    vi.spyOn(reflector, 'getAllAndMerge').mockReturnValue(['admin.access', 'user.read']);
    expect(() => guard.canActivate(contextFor(userWith('admin.access')))).toThrow('Bạn không có quyền');
  });

  it('rejects anonymous requests on protected routes', () => {
    vi.spyOn(reflector, 'getAllAndMerge').mockReturnValue(['admin.access']);
    expect(() => guard.canActivate(contextFor())).toThrow('Bạn không có quyền');
  });
});
