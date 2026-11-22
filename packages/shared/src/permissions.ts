import { Role, type SystemRole } from './enums.js';

/**
 * Every permission the app checks. The API syncs this list into the `permissions` table on boot,
 * so adding a key here is all it takes to introduce a new permission.
 */
export const PERMISSIONS = {
  'course.learn': { group: 'Học tập', label: 'Mua và học khóa học, viết đánh giá' },
  'instructor_application.submit': { group: 'Học tập', label: 'Gửi đơn đăng ký giảng viên' },

  'course.create': { group: 'Giảng dạy', label: 'Tạo khóa học mới' },
  'course.update_own': { group: 'Giảng dạy', label: 'Sửa khóa học của mình' },
  'course.submit': { group: 'Giảng dạy', label: 'Gửi khóa học đi duyệt' },
  'revenue.read_own': { group: 'Giảng dạy', label: 'Xem doanh thu khóa học của mình' },

  'admin.access': { group: 'Quản trị', label: 'Vào trang quản trị' },
  'course.update_any': { group: 'Quản trị', label: 'Sửa hoặc ẩn khóa học của người khác' },
  'course.moderate': { group: 'Quản trị', label: 'Duyệt khóa học' },
  'instructor_application.review': { group: 'Quản trị', label: 'Duyệt đơn giảng viên' },
  'category.manage': { group: 'Quản trị', label: 'Quản lý category và môn học' },
  'user.read': { group: 'Quản trị', label: 'Xem danh sách người dùng' },
  'user.lock': { group: 'Quản trị', label: 'Khóa và mở khóa tài khoản' },
  'user.assign_role': { group: 'Quản trị', label: 'Đổi role người dùng (Người dùng, Giảng viên)' },
  'order.manage': { group: 'Quản trị', label: 'Quản lý đơn hàng, hoàn tiền' },
  'coupon.manage': { group: 'Quản trị', label: 'Quản lý mã giảm giá' },
  'media.manage': { group: 'Quản trị', label: 'Quản lý thư viện media' },
  'audit.read': { group: 'Quản trị', label: 'Xem nhật ký thao tác' },

  'role.manage': { group: 'Chủ sở hữu', label: 'Sửa quyền của role, override quyền từng user, cấp role Admin/Owner' },
} as const satisfies Record<string, { group: string; label: string }>;

export type PermissionKey = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export function isPermissionKey(value: string): value is PermissionKey {
  return Object.hasOwn(PERMISSIONS, value);
}

const LEARNER: PermissionKey[] = ['course.learn'];
const TEACHER: PermissionKey[] = ['course.create', 'course.update_own', 'course.submit', 'revenue.read_own'];

/** Permissions given to the system roles when they are first created. Owners can change them later. */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, PermissionKey[]> = {
  [Role.USER]: [...LEARNER, 'instructor_application.submit'],
  [Role.INSTRUCTOR]: [...LEARNER, ...TEACHER],
  [Role.ADMIN]: PERMISSION_KEYS.filter((k) => k !== 'role.manage' && k !== 'instructor_application.submit'),
  // Owners bypass every check; the list is only for display.
  [Role.OWNER]: [...PERMISSION_KEYS],
};

/** Roles that only an owner may grant or take away. */
export const PRIVILEGED_ROLES: readonly string[] = [Role.ADMIN, Role.OWNER];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.register': 'Đăng ký tài khoản',
  'auth.login': 'Đăng nhập',
  'auth.login_failed': 'Đăng nhập thất bại',
  'auth.logout': 'Đăng xuất',
  'user.role_change': 'Đổi role',
  'user.status_change': 'Khóa / mở khóa tài khoản',
  'user.overrides_change': 'Đổi quyền riêng của user',
  'role.create': 'Tạo role',
  'role.permissions_change': 'Đổi quyền của role',
  'role.delete': 'Xóa role',
};
