import { PRIVILEGED_ROLES, type PermissionKey, Role } from '@elearning/shared';
import { badRequest, conflict, forbidden } from '../common/app-exception.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

/**
 * Who may change whom. Kept as plain functions so the rules are unit tested in one place.
 * Owners may do everything except leave the system without an owner.
 */
interface Target {
  id: string;
  roleKey: string;
}

const isOwner = (actor: AuthUser) => actor.role === Role.OWNER;
const isPrivileged = (roleKey: string) => PRIVILEGED_ROLES.includes(roleKey);

/** Non-owners cannot touch admins or owners at all. */
export function assertCanManageTarget(actor: AuthUser, target: Target): void {
  if (isOwner(actor) || !isPrivileged(target.roleKey)) return;
  throw forbidden('PRIVILEGED_TARGET', 'Chỉ Chủ sở hữu mới được thay đổi tài khoản Quản trị viên hoặc Chủ sở hữu');
}

/** Non-owners can only hand out roles that are not privileged and give no more than they have themselves. */
export function assertCanGrantPermissions(actor: AuthUser, permissions: readonly PermissionKey[]): void {
  if (isOwner(actor)) return;
  if (permissions.every((p) => actor.permissions.has(p))) return;
  throw forbidden('EXCEEDS_OWN_PERMISSIONS', 'Bạn không thể cấp quyền mà chính bạn không có');
}

export function assertCanAssignRole(
  actor: AuthUser,
  target: Target,
  newRole: { key: string; permissions: readonly PermissionKey[] },
  ownerCount: number,
): void {
  assertCanManageTarget(actor, target);
  if (!isOwner(actor) && isPrivileged(newRole.key)) {
    throw forbidden('PRIVILEGED_ROLE', 'Chỉ Chủ sở hữu mới được cấp role này');
  }
  assertCanGrantPermissions(actor, newRole.permissions);
  if (target.roleKey === Role.OWNER && newRole.key !== Role.OWNER && ownerCount <= 1) {
    throw conflict('LAST_OWNER', 'Hệ thống phải còn ít nhất một Chủ sở hữu');
  }
}

export function assertCanLock(actor: AuthUser, target: Target): void {
  if (target.id === actor.id) throw badRequest('CANNOT_LOCK_SELF', 'Bạn không thể tự khóa tài khoản của mình');
  if (target.roleKey === Role.OWNER) throw forbidden('CANNOT_LOCK_OWNER', 'Không thể khóa tài khoản Chủ sở hữu');
  assertCanManageTarget(actor, target);
}

export function assertCanOverride(actor: AuthUser, target: Target): void {
  if (target.roleKey === Role.OWNER) throw badRequest('OWNER_HAS_ALL', 'Chủ sở hữu luôn có mọi quyền');
  if (!isOwner(actor) && target.id === actor.id) {
    throw forbidden('CANNOT_OVERRIDE_SELF', 'Bạn không thể tự đổi quyền của mình');
  }
  assertCanManageTarget(actor, target);
}

/** Only owners edit privileged roles, and nobody edits the owner role (owners always have everything). */
export function assertCanEditRole(actor: AuthUser, roleKey: string): void {
  if (roleKey === Role.OWNER) throw badRequest('OWNER_ROLE_FIXED', 'Role Chủ sở hữu luôn có mọi quyền');
  if (!isOwner(actor) && isPrivileged(roleKey)) {
    throw forbidden('PRIVILEGED_ROLE', 'Chỉ Chủ sở hữu mới được sửa role này');
  }
}
