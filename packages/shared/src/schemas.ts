import { z } from 'zod';
import { CourseLevel, PermissionEffect, UserStatus } from './enums.js';
import { isPermissionKey } from './permissions.js';

export const registerSchema = z.object({
  email: z.email({ error: 'Email không hợp lệ' }).trim().toLowerCase(),
  password: z.string({ error: 'Vui lòng nhập mật khẩu' }).min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72),
  fullName: z.string({ error: 'Vui lòng nhập họ tên' }).trim().min(2, 'Vui lòng nhập họ tên').max(100),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email({ error: 'Email không hợp lệ' }).trim().toLowerCase(),
  password: z.string({ error: 'Vui lòng nhập mật khẩu' }).min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const courseListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  level: z.enum(Object.values(CourseLevel) as [CourseLevel, ...CourseLevel[]]).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
});
export type CourseListQuery = z.infer<typeof courseListQuerySchema>;

const permissionKeySchema = z.string().refine(isPermissionKey, 'Quyền không hợp lệ');
const roleKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9_]{1,31}$/, 'Mã role chỉ gồm chữ in hoa, số và dấu _, 2-32 ký tự');

export const adminUserListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.string().trim().max(32).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.LOCKED]).optional(),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const updateUserRoleSchema = z.object({ roleKey: roleKeySchema });
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.LOCKED]),
  reason: z.string().trim().max(500).optional(),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const setUserOverridesSchema = z.object({
  overrides: z
    .array(
      z.object({
        permissionKey: permissionKeySchema,
        effect: z.enum([PermissionEffect.GRANT, PermissionEffect.DENY]),
        reason: z.string().trim().max(500).optional(),
      }),
    )
    .max(100)
    .refine((list) => new Set(list.map((o) => o.permissionKey)).size === list.length, 'Mỗi quyền chỉ override một lần'),
});
export type SetUserOverridesInput = z.infer<typeof setUserOverridesSchema>;

export const createRoleSchema = z.object({
  key: roleKeySchema,
  name: z.string().trim().min(2, 'Vui lòng nhập tên role').max(60),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(permissionKeySchema).max(100).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const setRolePermissionsSchema = z.object({
  permissions: z.array(permissionKeySchema).max(100),
});
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>;

export const auditLogQuerySchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  actorId: z.string().trim().max(40).optional(),
  action: z.string().trim().max(60).optional(),
  targetType: z.string().trim().max(40).optional(),
  targetId: z.string().trim().max(40).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
