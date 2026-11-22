import { z } from 'zod';
import { CourseLevel } from './enums.js';

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
