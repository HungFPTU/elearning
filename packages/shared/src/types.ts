import type { CourseLevel, PermissionEffect, Role, UserStatus } from './enums.js';
import type { PermissionKey } from './permissions.js';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Error body returned by the API for every failed request. */
export interface ApiError {
  statusCode: number;
  message: string;
  code: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
}

/** `GET /me`: the signed-in user plus what they may do. */
export interface MeDto extends UserDto {
  status: UserStatus;
  /** Effective permissions (role + overrides). Owners get every key. */
  permissions: PermissionKey[];
}

export interface RoleSummaryDto {
  key: Role;
  name: string;
}

export interface AdminUserListItemDto {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: RoleSummaryDto;
  status: UserStatus;
  createdAt: string;
}

export interface PermissionOverrideDto {
  permissionKey: PermissionKey;
  effect: PermissionEffect;
  reason: string | null;
  grantedBy: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  rolePermissions: PermissionKey[];
  overrides: PermissionOverrideDto[];
  effectivePermissions: PermissionKey[];
  courseCount: number;
  enrollmentCount: number;
}

export interface RoleDto extends RoleSummaryDto {
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: PermissionKey[];
}

export interface PermissionDto {
  key: PermissionKey;
  group: string;
  label: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  actor: { id: string; fullName: string; email: string } | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserDto;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
}

export interface CourseSummaryDto {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  /** VND */
  price: number;
  /** VND */
  salePrice: number | null;
  level: CourseLevel;
  instructor: { id: string; fullName: string };
  category: CategoryDto | null;
  lessonCount: number;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface LessonOutlineDto {
  id: string;
  title: string;
  durationSeconds: number;
  isPreview: boolean;
}

export interface SectionOutlineDto {
  id: string;
  title: string;
  lessons: LessonOutlineDto[];
}

export interface CourseDetailDto extends CourseSummaryDto {
  description: string;
  previewVideoUrl: string | null;
  language: string;
  publishedAt: string | null;
  sections: SectionOutlineDto[];
  totalDurationSeconds: number;
}
