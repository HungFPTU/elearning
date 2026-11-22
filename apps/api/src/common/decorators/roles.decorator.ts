import { SetMetadata } from '@nestjs/common';
import type { Role } from '@elearning/shared';

export const ROLES_KEY = 'roles';
/** Restrict a route to the given roles (checked by RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
