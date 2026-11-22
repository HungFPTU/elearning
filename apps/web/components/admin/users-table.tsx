'use client';

import type { AdminUserListItemDto, Paginated, RoleDto } from '@elearning/shared';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { ErrorText } from './error-text';
import { Pagination } from './pagination';
import { RoleBadge, StatusBadge } from './role-badge';
import { toQueryString, useAdminQuery } from './use-admin-api';

const PAGE_SIZE = 20;

export function UsersTable() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ q: '', role: '', status: '', page: 1 });
  const roles = useAdminQuery<RoleDto[]>(['roles'], '/admin/roles');
  const qs = toQueryString({ ...filters, pageSize: PAGE_SIZE });
  const users = useAdminQuery<Paginated<AdminUserListItemDto>>(['users', qs], `/admin/users?${qs}`);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: search.trim(), page: 1 }));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email"
          className="max-w-xs"
        />
        <Select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, page: 1 }))}>
          <option value="">Tất cả role</option>
          {roles.data?.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </Select>
        <Button type="submit">Tìm</Button>
      </form>

      <ErrorText error={users.error} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Người dùng</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              <th className="px-4 py-2 font-medium">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {users.isPending && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}
            {users.data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  Không có người dùng nào
                </td>
              </tr>
            )}
            {users.data?.items.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-indigo-700 hover:underline">
                    {u.fullName}
                  </Link>
                  <div className="text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-2">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-4 py-2 text-slate-600">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.data && (
        <Pagination
          page={users.data.page}
          pageSize={users.data.pageSize}
          total={users.data.total}
          onChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
    </div>
  );
}
