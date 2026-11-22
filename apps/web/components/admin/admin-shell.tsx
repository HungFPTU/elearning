'use client';

import type { PermissionKey } from '@elearning/shared';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  permission: PermissionKey;
  /** Not built yet: shown greyed out so the admin sees what is coming. */
  soon?: boolean;
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Tổng quan', permission: 'admin.access' },
  { href: '/admin/users', label: 'Người dùng', permission: 'user.read' },
  { href: '/admin/roles', label: 'Role và quyền', permission: 'admin.access' },
  { href: '/admin/audit-logs', label: 'Nhật ký thao tác', permission: 'audit.read' },
  { href: '/admin/instructor-applications', label: 'Đơn giảng viên', permission: 'instructor_application.review', soon: true },
  { href: '/admin/courses', label: 'Duyệt khóa học', permission: 'course.moderate', soon: true },
  { href: '/admin/categories', label: 'Danh mục và môn học', permission: 'category.manage', soon: true },
  { href: '/admin/media', label: 'Thư viện media', permission: 'media.manage', soon: true },
  { href: '/admin/orders', label: 'Đơn hàng', permission: 'order.manage', soon: true },
];

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isLoading, can } = useAuth();

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Đang tải...</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4">Vui lòng đăng nhập để vào trang quản trị.</p>
        <Link href="/login" className={buttonClasses('primary')}>
          Đăng nhập
        </Link>
      </div>
    );
  }
  if (!can('admin.access')) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Bạn không có quyền truy cập</h1>
        <p className="text-slate-600">Trang này chỉ dành cho quản trị viên.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        {/* usePathname is request-time data on dynamic routes, so it streams in. */}
        <Suspense fallback={null}>
          <AdminNav />
        </Suspense>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function AdminNav() {
  const { can } = useAuth();
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {NAV.filter((item) => can(item.permission)).map((item) =>
        item.soon ? (
          <span key={item.href} className="flex items-center justify-between rounded-md px-3 py-2 text-sm whitespace-nowrap text-slate-400">
            {item.label}
            <span className="ml-2 text-[10px] uppercase">Sắp có</span>
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm whitespace-nowrap',
              isActive(pathname, item.href) ? 'bg-indigo-50 font-medium text-indigo-700' : 'hover:bg-slate-100',
            )}
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
