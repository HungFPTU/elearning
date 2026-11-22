import Link from 'next/link';

const SECTIONS = [
  { href: '/admin/users', title: 'Người dùng', text: 'Xem tài khoản, đổi role, khóa tài khoản, cấp quyền riêng.' },
  { href: '/admin/roles', title: 'Role và quyền', text: 'Mỗi role là một nhóm quyền. Chủ sở hữu chỉnh được quyền của từng role.' },
  { href: '/admin/instructor-applications', title: 'Đơn giảng viên', text: 'Duyệt hoặc từ chối đơn, chọn môn được dạy.' },
  { href: '/admin/categories', title: 'Danh mục và môn học', text: 'Cây danh mục, môn học và các trường riêng của từng danh mục.' },
  { href: '/admin/audit-logs', title: 'Nhật ký thao tác', text: 'Ai đã làm gì, lúc nào, từ đâu.' },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Trang quản trị</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300">
            <h2 className="font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.text}</p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-slate-500">Bảng số liệu (doanh thu, học viên mới) sẽ có ở milestone 5.</p>
    </div>
  );
}
