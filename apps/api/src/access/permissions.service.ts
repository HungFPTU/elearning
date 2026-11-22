import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_KEYS,
  type PermissionKey,
  ROLE_LABELS,
  type SystemRole,
  UserStatus,
} from '@elearning/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { resolvePermissions } from './resolve-permissions.js';

export interface UserAccess {
  roleKey: string;
  status: UserStatus;
  permissions: PermissionKey[];
}

const CACHE_TTL_MS = 30_000;

/**
 * Resolves what a user may do and keeps a short in-memory cache.
 * Call `invalidateUser` / `invalidateAll` after changing roles, overrides or status.
 * (Single API instance for now; move the cache to Redis when we scale out.)
 */
@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly cache = new Map<string, { access: UserAccess; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.syncCatalog();
  }

  /** Mirrors `PERMISSIONS` into the DB and makes sure every system role exists with its defaults. */
  async syncCatalog(): Promise<void> {
    await this.prisma.$transaction([
      ...PERMISSION_KEYS.map((key) =>
        this.prisma.permission.upsert({
          where: { key },
          update: { group: PERMISSIONS[key].group, label: PERMISSIONS[key].label },
          create: { key, group: PERMISSIONS[key].group, label: PERMISSIONS[key].label },
        }),
      ),
      this.prisma.rolePermission.deleteMany({ where: { permissionKey: { notIn: PERMISSION_KEYS } } }),
      this.prisma.userPermissionOverride.deleteMany({ where: { permissionKey: { notIn: PERMISSION_KEYS } } }),
    ]);

    for (const [key, defaults] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [SystemRole, PermissionKey[]][]) {
      const role = await this.prisma.role.upsert({
        where: { key },
        update: { isSystem: true },
        create: { key, name: ROLE_LABELS[key], isSystem: true },
        select: { id: true, _count: { select: { permissions: true } } },
      });
      // A system role with no permissions at all has never been configured: give it the defaults.
      if (role._count.permissions > 0) continue;
      await this.prisma.rolePermission.createMany({
        data: defaults.map((permissionKey) => ({ roleId: role.id, permissionKey })),
        skipDuplicates: true,
      });
      this.logger.log(`Gave role ${key} its default permissions`);
    }
  }

  async getAccess(userId: string): Promise<UserAccess | null> {
    const hit = this.cache.get(userId);
    if (hit && hit.expiresAt > Date.now()) return hit.access;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        role: { select: { key: true, permissions: { select: { permissionKey: true } } } },
        permissionOverrides: { select: { permissionKey: true, effect: true } },
      },
    });
    if (!user) {
      this.cache.delete(userId);
      return null;
    }
    const access: UserAccess = {
      roleKey: user.role.key,
      status: user.status,
      permissions: resolvePermissions(
        user.role.key,
        user.role.permissions.map((p) => p.permissionKey),
        user.permissionOverrides,
      ),
    };
    this.cache.set(userId, { access, expiresAt: Date.now() + CACHE_TTL_MS });
    return access;
  }

  invalidateUser(userId: string): void {
    this.cache.delete(userId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
