import { PERMISSION_KEYS, type PermissionKey, PermissionEffect, Role, isPermissionKey } from '@elearning/shared';

export interface OverrideInput {
  permissionKey: string;
  effect: PermissionEffect;
}

/**
 * Effective permissions = role permissions + GRANT overrides - DENY overrides.
 * DENY always wins. Owners get every permission and cannot be restricted.
 * Unknown keys (e.g. a permission removed from the catalog) are ignored.
 */
export function resolvePermissions(
  roleKey: string,
  rolePermissions: readonly string[],
  overrides: readonly OverrideInput[],
): PermissionKey[] {
  if (roleKey === Role.OWNER) return [...PERMISSION_KEYS];

  const granted = new Set(rolePermissions.filter(isPermissionKey));
  for (const o of overrides) {
    if (o.effect === PermissionEffect.GRANT && isPermissionKey(o.permissionKey)) granted.add(o.permissionKey);
  }
  for (const o of overrides) {
    if (o.effect === PermissionEffect.DENY && isPermissionKey(o.permissionKey)) granted.delete(o.permissionKey);
  }
  return PERMISSION_KEYS.filter((k) => granted.has(k));
}
