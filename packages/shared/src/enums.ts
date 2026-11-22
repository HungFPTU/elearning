/** Keys of the built-in (system) roles. Owners can create more roles with their own keys. */
export const Role = {
  USER: 'USER',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
} as const;
export type SystemRole = (typeof Role)[keyof typeof Role];
/** Any role key, built-in or custom. */
export type Role = string;

export const ROLE_LABELS: Record<SystemRole, string> = {
  USER: 'Người dùng',
  INSTRUCTOR: 'Giảng viên',
  ADMIN: 'Quản trị viên',
  OWNER: 'Chủ sở hữu',
};

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const PermissionEffect = {
  GRANT: 'GRANT',
  DENY: 'DENY',
} as const;
export type PermissionEffect = (typeof PermissionEffect)[keyof typeof PermissionEffect];

export const CourseLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  ALL_LEVELS: 'ALL_LEVELS',
} as const;
export type CourseLevel = (typeof CourseLevel)[keyof typeof CourseLevel];

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
  ALL_LEVELS: 'Mọi cấp độ',
};

export const ApplicationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
};

/** Input types an admin can use for a category's extra course fields. */
export const CategoryFieldType = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
} as const;
export type CategoryFieldType = (typeof CategoryFieldType)[keyof typeof CategoryFieldType];
