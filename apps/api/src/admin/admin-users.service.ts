import { Injectable } from '@nestjs/common';
import {
  type AdminUserDetailDto,
  type AdminUserListItemDto,
  type AdminUserListQuery,
  type Paginated,
  PermissionEffect,
  type PermissionKey,
  Role,
  type SetUserOverridesInput,
  type UpdateUserStatusInput,
  UserStatus,
  isPermissionKey,
  searchWords,
} from '@elearning/shared';
import { PermissionsService } from '../access/permissions.service.js';
import { resolvePermissions } from '../access/resolve-permissions.js';
import { AuditService } from '../audit/audit.service.js';
import { notFound } from '../common/app-exception.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type { RequestContext } from '../common/decorators/request-context.decorator.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  assertCanAssignRole,
  assertCanGrantPermissions,
  assertCanLock,
  assertCanManageTarget,
  assertCanOverride,
} from './admin-rules.js';

const listSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  role: { select: { key: true, name: true } },
} as const satisfies Prisma.UserSelect;

export const teachingSubjectSelect = {
  id: true,
  name: true,
  slug: true,
  category: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.SubjectSelect;

type ListRow = Prisma.UserGetPayload<{ select: typeof listSelect }>;

const toListItem = (u: ListRow): AdminUserListItemDto => ({ ...u, createdAt: u.createdAt.toISOString() });
const userNotFound = () => notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng');
const onlyKnown = (keys: string[]): PermissionKey[] => keys.filter(isPermissionKey);

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async list(query: AdminUserListQuery): Promise<Paginated<AdminUserListItemDto>> {
    const where: Prisma.UserWhereInput = {
      status: query.status,
      role: query.role ? { key: query.role } : undefined,
      // Accent-insensitive "email fullName" match, uses the trigram index on searchText.
      AND: searchWords(query.q ?? '').map((word) => ({ searchText: { contains: word } })),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: rows.map(toListItem), total, page: query.page, pageSize: query.pageSize };
  }

  async detail(id: string): Promise<AdminUserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...listSelect,
        role: { select: { key: true, name: true, permissions: { select: { permissionKey: true } } } },
        permissionOverrides: {
          select: {
            permissionKey: true,
            effect: true,
            reason: true,
            createdAt: true,
            grantedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { permissionKey: 'asc' },
        },
        _count: { select: { coursesTaught: true, enrollments: true } },
        teachingSubjects: {
          orderBy: { subject: { name: 'asc' } },
          select: { subject: { select: teachingSubjectSelect } },
        },
      },
    });
    if (!user) throw userNotFound();

    const rolePermissions = onlyKnown(user.role.permissions.map((p) => p.permissionKey));
    const overrides = user.permissionOverrides.flatMap((o) =>
      isPermissionKey(o.permissionKey)
        ? [{ ...o, permissionKey: o.permissionKey, createdAt: o.createdAt.toISOString() }]
        : [],
    );
    return {
      ...toListItem({ ...user, role: { key: user.role.key, name: user.role.name } }),
      rolePermissions,
      overrides,
      effectivePermissions: resolvePermissions(user.role.key, rolePermissions, overrides),
      teachingSubjects: user.teachingSubjects.map((t) => t.subject),
      courseCount: user._count.coursesTaught,
      enrollmentCount: user._count.enrollments,
    };
  }

  async changeRole(actor: AuthUser, id: string, roleKey: string, ctx: RequestContext): Promise<AdminUserDetailDto> {
    const [target, newRole, ownerCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id }, select: { id: true, role: { select: { key: true } } } }),
      this.prisma.role.findUnique({
        where: { key: roleKey },
        select: { id: true, key: true, permissions: { select: { permissionKey: true } } },
      }),
      this.prisma.user.count({ where: { role: { key: Role.OWNER } } }),
    ]);
    if (!target) throw userNotFound();
    if (!newRole) throw notFound('ROLE_NOT_FOUND', 'Không tìm thấy role');
    if (target.role.key === newRole.key) return this.detail(id);

    assertCanAssignRole(
      actor,
      { id: target.id, roleKey: target.role.key },
      { key: newRole.key, permissions: onlyKnown(newRole.permissions.map((p) => p.permissionKey)) },
      ownerCount,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { roleId: newRole.id } });
      await this.audit.record(
        {
          action: 'user.role_change',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'user',
          targetId: id,
          before: { role: target.role.key },
          after: { role: newRole.key },
        },
        ctx,
        tx,
      );
    });
    this.permissions.invalidateUser(id);
    return this.detail(id);
  }

  async changeStatus(
    actor: AuthUser,
    id: string,
    input: UpdateUserStatusInput,
    ctx: RequestContext,
  ): Promise<AdminUserDetailDto> {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true, role: { select: { key: true } } },
    });
    if (!target) throw userNotFound();
    if (target.status === input.status) return this.detail(id);
    if (input.status === UserStatus.LOCKED) assertCanLock(actor, { id, roleKey: target.role.key });
    else assertCanManageTarget(actor, { id, roleKey: target.role.key });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: input.status } });
      if (input.status === UserStatus.LOCKED) {
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await this.audit.record(
        {
          action: 'user.status_change',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'user',
          targetId: id,
          before: { status: target.status },
          after: { status: input.status, reason: input.reason },
        },
        ctx,
        tx,
      );
    });
    this.permissions.invalidateUser(id);
    return this.detail(id);
  }

  /** Replaces the user's whole override list. */
  async setOverrides(
    actor: AuthUser,
    id: string,
    input: SetUserOverridesInput,
    ctx: RequestContext,
  ): Promise<AdminUserDetailDto> {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: { select: { key: true } },
        permissionOverrides: { select: { permissionKey: true, effect: true, reason: true } },
      },
    });
    if (!target) throw userNotFound();
    assertCanOverride(actor, { id, roleKey: target.role.key });
    assertCanGrantPermissions(
      actor,
      onlyKnown(input.overrides.filter((o) => o.effect === PermissionEffect.GRANT).map((o) => o.permissionKey)),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.userPermissionOverride.deleteMany({ where: { userId: id } });
      await tx.userPermissionOverride.createMany({
        data: input.overrides.map((o) => ({
          userId: id,
          permissionKey: o.permissionKey,
          effect: o.effect,
          reason: o.reason ?? null,
          grantedById: actor.id,
        })),
      });
      await this.audit.record(
        {
          action: 'user.overrides_change',
          actorId: actor.id,
          actorRole: actor.role,
          targetType: 'user',
          targetId: id,
          before: target.permissionOverrides,
          after: input.overrides,
        },
        ctx,
        tx,
      );
    });
    this.permissions.invalidateUser(id);
    return this.detail(id);
  }
}

