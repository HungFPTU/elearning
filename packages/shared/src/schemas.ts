import { z } from 'zod';
import { ApplicationStatus, CategoryFieldType, CourseLevel, PermissionEffect, UserStatus } from './enums.js';
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
  subject: z.string().trim().max(100).optional(),
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

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang')
  .max(80);
const idListSchema = (max: number) =>
  z
    .array(z.string().min(1).max(40))
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, 'Danh sách bị trùng');

export const categoryFieldSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{0,39}$/, 'Mã trường chỉ gồm chữ thường, số và dấu _'),
    label: z.string().trim().min(1, 'Vui lòng nhập tên trường').max(60),
    type: z.enum([CategoryFieldType.TEXT, CategoryFieldType.NUMBER, CategoryFieldType.SELECT]),
    options: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    required: z.boolean().default(false),
  })
  .refine((f) => f.type !== CategoryFieldType.SELECT || f.options.length > 0, {
    error: 'Trường dạng lựa chọn cần ít nhất một lựa chọn',
    path: ['options'],
  });
export type CategoryField = z.infer<typeof categoryFieldSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập tên danh mục').max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).nullish(),
  position: z.coerce.number().int().min(0).max(10_000).default(0),
  courseFields: z
    .array(categoryFieldSchema)
    .max(20)
    .refine((fields) => new Set(fields.map((f) => f.key)).size === fields.length, 'Mã trường bị trùng')
    .default([]),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const subjectInputSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập tên môn học').max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).nullish(),
  position: z.coerce.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
});
export type SubjectInput = z.infer<typeof subjectInputSchema>;

export const submitApplicationSchema = z.object({
  subjectIds: idListSchema(10).min(1, 'Chọn ít nhất một môn muốn dạy'),
  headline: z.string().trim().min(5, 'Giới thiệu ngắn tối thiểu 5 ký tự').max(120),
  bio: z.string().trim().min(30, 'Giới thiệu bản thân tối thiểu 30 ký tự').max(2000),
  experience: z.string().trim().min(30, 'Kinh nghiệm giảng dạy tối thiểu 30 ký tự').max(3000),
  links: z.array(z.url({ error: 'Link không hợp lệ' }).max(300)).max(5).default([]),
});
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export const applicationListQuerySchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum([ApplicationStatus.PENDING, ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]).optional(),
});
export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

export const approveApplicationSchema = z.object({
  subjectIds: idListSchema(10).min(1, 'Chọn ít nhất một môn được duyệt'),
  note: z.string().trim().max(1000).optional(),
});
export type ApproveApplicationInput = z.infer<typeof approveApplicationSchema>;

export const rejectApplicationSchema = z.object({
  note: z.string().trim().min(5, 'Vui lòng ghi lý do từ chối').max(1000),
});
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;

export const setUserSubjectsSchema = z.object({ subjectIds: idListSchema(100) });
export type SetUserSubjectsInput = z.infer<typeof setUserSubjectsSchema>;
