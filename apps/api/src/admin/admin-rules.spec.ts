import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_KEYS, Role } from '@elearning/shared';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import {
  assertCanAssignRole,
  assertCanEditRole,
  assertCanGrantPermissions,
  assertCanLock,
  assertCanOverride,
} from './admin-rules.js';

const owner: AuthUser = { id: 'owner', role: Role.OWNER, permissions: new Set(PERMISSION_KEYS) };
const admin: AuthUser = { id: 'admin', role: Role.ADMIN, permissions: new Set(DEFAULT_ROLE_PERMISSIONS.ADMIN) };
const instructorRole = { key: Role.INSTRUCTOR, permissions: DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR };
const adminRole = { key: Role.ADMIN, permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN };
const userTarget = { id: 'u1', roleKey: Role.USER };

describe('admin rules', () => {
  describe('assertCanAssignRole', () => {
    it('lets an admin promote a user to instructor', () => {
      expect(() => assertCanAssignRole(admin, userTarget, instructorRole, 1)).not.toThrow();
    });

    it('stops an admin from granting the admin role', () => {
      expect(() => assertCanAssignRole(admin, userTarget, adminRole, 1)).toThrow('Chỉ Chủ sở hữu');
    });

    it('stops an admin from changing another admin', () => {
      expect(() => assertCanAssignRole(admin, { id: 'a2', roleKey: Role.ADMIN }, instructorRole, 1)).toThrow(
        'Chỉ Chủ sở hữu',
      );
    });

    it('stops an admin from handing out a custom role with permissions they lack', () => {
      const custom = { key: 'AUDITOR', permissions: ['role.manage' as const] };
      expect(() => assertCanAssignRole(admin, userTarget, custom, 1)).toThrow('chính bạn không có');
    });

    it('lets the owner grant the admin role', () => {
      expect(() => assertCanAssignRole(owner, userTarget, adminRole, 1)).not.toThrow();
    });

    it('keeps at least one owner', () => {
      const target = { id: 'owner', roleKey: Role.OWNER };
      expect(() => assertCanAssignRole(owner, target, adminRole, 1)).toThrow('ít nhất một Chủ sở hữu');
      expect(() => assertCanAssignRole(owner, target, adminRole, 2)).not.toThrow();
    });
  });

  describe('assertCanLock', () => {
    it('lets an admin lock a user', () => {
      expect(() => assertCanLock(admin, userTarget)).not.toThrow();
    });

    it('blocks locking yourself, an owner, or (for admins) another admin', () => {
      expect(() => assertCanLock(admin, { id: 'admin', roleKey: Role.ADMIN })).toThrow('tự khóa');
      expect(() => assertCanLock(owner, { id: 'o2', roleKey: Role.OWNER })).toThrow('Chủ sở hữu');
      expect(() => assertCanLock(admin, { id: 'a2', roleKey: Role.ADMIN })).toThrow('Chỉ Chủ sở hữu');
      expect(() => assertCanLock(owner, { id: 'a2', roleKey: Role.ADMIN })).not.toThrow();
    });
  });

  describe('assertCanOverride', () => {
    it('rejects overrides on owners', () => {
      expect(() => assertCanOverride(owner, { id: 'o2', roleKey: Role.OWNER })).toThrow('mọi quyền');
    });

    it('stops a non-owner from overriding their own permissions', () => {
      const manager: AuthUser = { ...admin, permissions: new Set([...admin.permissions, 'role.manage' as const]) };
      expect(() => assertCanOverride(manager, { id: 'admin', roleKey: Role.ADMIN })).toThrow();
    });
  });

  describe('assertCanEditRole / assertCanGrantPermissions', () => {
    it('never allows editing the owner role', () => {
      expect(() => assertCanEditRole(owner, Role.OWNER)).toThrow('mọi quyền');
    });

    it('lets only owners edit privileged roles', () => {
      expect(() => assertCanEditRole(admin, Role.ADMIN)).toThrow('Chỉ Chủ sở hữu');
      expect(() => assertCanEditRole(owner, Role.ADMIN)).not.toThrow();
      expect(() => assertCanEditRole(admin, Role.INSTRUCTOR)).not.toThrow();
    });

    it('lets a non-owner grant only permissions they hold', () => {
      expect(() => assertCanGrantPermissions(admin, ['course.learn', 'audit.read'])).not.toThrow();
      expect(() => assertCanGrantPermissions(admin, ['role.manage'])).toThrow();
    });
  });
});
