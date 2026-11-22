import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  type AdminUserDetailDto,
  type AdminUserListItemDto,
  type AdminUserListQuery,
  type AuditLogDto,
  type AuditLogQuery,
  type CreateRoleInput,
  type Paginated,
  type PermissionDto,
  type RoleDto,
  type SetRolePermissionsInput,
  type SetUserOverridesInput,
  type UpdateUserRoleInput,
  type UpdateUserStatusInput,
  adminUserListQuerySchema,
  auditLogQuerySchema,
  createRoleSchema,
  setRolePermissionsSchema,
  setUserOverridesSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '@elearning/shared';
import { AuditService } from '../audit/audit.service.js';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReqContext, type RequestContext } from '../common/decorators/request-context.decorator.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { AdminRolesService } from './admin-roles.service.js';
import { AdminUsersService } from './admin-users.service.js';

@RequirePermission('admin.access')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly roles: AdminRolesService,
    private readonly audit: AuditService,
  ) {}

  @Get('users')
  @RequirePermission('user.read')
  listUsers(@Query({ schema: adminUserListQuerySchema }) query: AdminUserListQuery): Promise<Paginated<AdminUserListItemDto>> {
    return this.users.list(query);
  }

  @Get('users/:id')
  @RequirePermission('user.read')
  getUser(@Param('id') id: string): Promise<AdminUserDetailDto> {
    return this.users.detail(id);
  }

  @Patch('users/:id/role')
  @RequirePermission('user.assign_role')
  changeRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: updateUserRoleSchema }) body: UpdateUserRoleInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminUserDetailDto> {
    return this.users.changeRole(actor, id, body.roleKey, ctx);
  }

  @Patch('users/:id/status')
  @RequirePermission('user.lock')
  changeStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: updateUserStatusSchema }) body: UpdateUserStatusInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminUserDetailDto> {
    return this.users.changeStatus(actor, id, body, ctx);
  }

  @Put('users/:id/overrides')
  @RequirePermission('role.manage')
  setOverrides(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body({ schema: setUserOverridesSchema }) body: SetUserOverridesInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<AdminUserDetailDto> {
    return this.users.setOverrides(actor, id, body, ctx);
  }

  @Get('roles')
  listRoles(): Promise<RoleDto[]> {
    return this.roles.list();
  }

  @Get('roles/:key')
  getRole(@Param('key') key: string): Promise<RoleDto> {
    return this.roles.get(key);
  }

  @Post('roles')
  @RequirePermission('role.manage')
  createRole(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createRoleSchema }) body: CreateRoleInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<RoleDto> {
    return this.roles.create(actor, body, ctx);
  }

  @Put('roles/:key/permissions')
  @RequirePermission('role.manage')
  setRolePermissions(
    @CurrentUser() actor: AuthUser,
    @Param('key') key: string,
    @Body({ schema: setRolePermissionsSchema }) body: SetRolePermissionsInput,
    @ReqContext() ctx: RequestContext,
  ): Promise<RoleDto> {
    return this.roles.setPermissions(actor, key, body, ctx);
  }

  @Delete('roles/:key')
  @RequirePermission('role.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRole(@CurrentUser() actor: AuthUser, @Param('key') key: string, @ReqContext() ctx: RequestContext): Promise<void> {
    return this.roles.remove(actor, key, ctx);
  }

  @Get('permissions')
  listPermissions(): PermissionDto[] {
    return this.roles.listPermissions();
  }

  @Get('audit-logs')
  @RequirePermission('audit.read')
  listAuditLogs(@Query({ schema: auditLogQuerySchema }) query: AuditLogQuery): Promise<Paginated<AuditLogDto>> {
    return this.audit.list(query);
  }
}
