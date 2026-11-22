'use client';

import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';

export function UserMenu() {
  const { user, isLoading, logout, can } = useAuth();
  if (isLoading) return <div className="h-10 w-32" />;
  if (!user) {
    return (
      <div className="flex gap-2">
        <Link href="/login" className={buttonClasses('ghost')}>
          Đăng nhập
        </Link>
        <Link href="/register" className={buttonClasses('primary')}>
          Đăng ký
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {can('instructor_application.submit') && (user.role === 'USER' || user.role === 'INSTRUCTOR') && (
        <Link href="/become-instructor" className={buttonClasses('ghost')}>
          {user.role === 'INSTRUCTOR' ? 'Dạy thêm môn' : 'Trở thành giảng viên'}
        </Link>
      )}
      {can('admin.access') && (
        <Link href="/admin" className={buttonClasses('ghost')}>
          Quản trị
        </Link>
      )}
      <span className="text-sm">
        Xin chào, <strong>{user.fullName}</strong>
      </span>
      <button type="button" onClick={() => void logout()} className={buttonClasses('outline')}>
        Đăng xuất
      </button>
    </div>
  );
}
