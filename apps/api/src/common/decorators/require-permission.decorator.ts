import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@elearning/shared';

export const PERMISSIONS_KEY = 'permissions';
/**
 * The route needs every listed permission (checked by PermissionsGuard).
 * Class and method decorators add up: `@RequirePermission('admin.access')` on the controller plus
 * `@RequirePermission('user.read')` on a method means both are required.
 */
export const RequirePermission = (...permissions: PermissionKey[]) => SetMetadata(PERMISSIONS_KEY, permissions);
