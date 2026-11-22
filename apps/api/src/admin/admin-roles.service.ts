import { Injectable } from '@nestjs/common';
import {
  type CreateRoleInput,
  PERMISSIONS,
  PERMISSION_KEYS,
  type PermissionDto,
  type PermissionKey,
  type RoleDto,
  type SetRolePermissionsInput,
  isPermissionKey,
} from '@elearning/shared';
import { PermissionsService } from '../access/permissions.service.js';
import { AuditService } from '../audit/audit.service.js';
import { badRequest, conflict, notFound } from '../common/app-exception.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type { RequestContext } from '../common/decorators/request-context.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertCanEditRole, assertCanGrantPermissions } from './admin-rules.js';

const roleSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  isSystem: true,
  permissions: { select: { permissionKey: true } },
  _count: { select: { users: true } },
} as const;

interface RoleRow {
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permissionKey: string }[];
  _count: { users: number };
}

const SYSTEM_ORDER = ['USER', 'INSTRUCTOR', 'ADMIN', 'OWNER'];

const toRoleDto = (r: RoleRow): RoleDto => ({
  key: r.key,
  name: r.name,
  description: r.description,
  isSystem: r.isSystem,
  userCount: r._count.users,
  permissions: PERMISSION_KEYS.filter((k) => r.permissions.some((p) => p.permissionKey === k)),
});

const roleNotFound = () => notFound('ROLE_NOT_FOUND', 'Không tìm thấy role');

@Injectable()
export class AdminRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  listPermissions(): PermissionDto[] {
    return PERMISSION_KEYS.map((key) => ({ key, ...PERMISSIONS[key] }));
  }

  async list(): Promise<RoleDto[]> {
    const rows = await this.prisma.role.findMany({ select: roleSelect, orderBy: { createdAt: 'asc' } });
    const rank = (key: string) => (SYSTEM_ORDER.includes(key) ? SYSTEM_ORDER.indexOf(key) : SYSTEM_ORDER.length);
    return rows.sort((a, b) => rank(a.key) - rank(b.key)).map(toRoleDto);
  }

  async get(key: string): Promise<RoleDto> {
    const row = await this.prisma.role.findUnique({ where: { key }, select: roleSelect });
    if (!row) throw roleNotFound();
    return toRoleDto(row);
  }

  async create(actor: AuthUser, input: CreateRoleInput, ctx: RequestContext): Promise<RoleDto> {
    const permissions = input.permissions.filter(isPermissionKey);
    assertCanGrantPermissions(actor, permissions);
    const exists = await this.prisma.role.findUnique({ where: { key: input.key }, select: { id: true } });
    if (exists) throw conflict('ROLE_KEY_TAKEN', 'Mã role này đã tồn tại');

    await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          permissions: { create: permissions.map((permissionKey) => ({ permissionKey })) },
        },
        select: { id: true },
      });
      await this.audit.record(
        {
          action: 'role.create',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'role',
          targetId: role.id,
          after: { key: input.key, name: input.name, permissions },
        },
        ctx,
        tx,
      );
    });
    return this.get(input.key);
  }

  async setPermissions(
    actor: AuthUser,
    key: string,
    input: SetRolePermissionsInput,
    ctx: RequestContext,
  ): Promise<RoleDto> {
    assertCanEditRole(actor, key);
    const role = await this.prisma.role.findUnique({
      where: { key },
      select: { id: true, permissions: { select: { permissionKey: true } } },
    });
    if (!role) throw roleNotFound();

    const next: PermissionKey[] = [...new Set(input.permissions.filter(isPermissionKey))];
    const before = role.permissions.map((p) => p.permissionKey);
    assertCanGrantPermissions(
      actor,
      next.filter((p) => !before.includes(p)),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({ data: next.map((permissionKey) => ({ roleId: role.id, permissionKey })) });
      await this.audit.record(
        {
          action: 'role.permissions_change',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'role',
          targetId: role.id,
          before: { key, permissions: before },
          after: { key, permissions: next },
        },
        ctx,
        tx,
      );
    });
    this.permissions.invalidateAll();
    return this.get(key);
  }

  async remove(actor: AuthUser, key: string, ctx: RequestContext): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { key },
      select: { id: true, name: true, isSystem: true, _count: { select: { users: true } } },
    });
    if (!role) throw roleNotFound();
    if (role.isSystem) throw badRequest('SYSTEM_ROLE', 'Không thể xóa role hệ thống');
    if (role._count.users > 0) throw conflict('ROLE_IN_USE', 'Role này đang được gán cho người dùng');

    await this.prisma.$transaction(async (tx) => {
      await tx.role.delete({ where: { id: role.id } });
      await this.audit.record(
        {
          action: 'role.delete',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'role',
          targetId: role.id,
          before: { key, name: role.name },
        },
        ctx,
        tx,
      );
    });
  }
}
