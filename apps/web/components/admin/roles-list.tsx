'use client';

import { type CreateRoleInput, type RoleDto, createRoleSchema } from '@elearning/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorText } from './error-text';
import { jsonBody, useAdminQuery } from './use-admin-api';

export function RolesList() {
  const { can } = useAuth();
  const roles = useAdminQuery<RoleDto[]>(['roles'], '/admin/roles');

  return (
    <div className="space-y-6">
      <ErrorText error={roles.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.data?.map((r) => (
          <Link
            key={r.key}
            href={`/admin/roles/${r.key}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{r.name}</h2>
              {r.isSystem ? <Badge>Hệ thống</Badge> : <Badge tone="indigo">Tùy chỉnh</Badge>}
            </div>
            <code className="text-xs text-slate-400">{r.key}</code>
            {r.description && <p className="mt-1 text-sm text-slate-600">{r.description}</p>}
            <p className="mt-2 text-sm text-slate-600">
              {r.userCount} người dùng · {r.permissions.length} quyền
            </p>
          </Link>
        ))}
      </div>
      {can('role.manage') && <CreateRoleForm />}
    </div>
  );
}

function CreateRoleForm() {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const form = useForm<z.input<typeof createRoleSchema>, unknown, CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { key: '', name: '', description: '', permissions: ['admin.access'] },
  });
  const create = useMutation({
    mutationFn: (input: CreateRoleInput) => authFetch<RoleDto>('/admin/roles', jsonBody('POST', input)),
    onSuccess: () => {
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
  const { errors } = form.formState;

  return (
    <Card title="Tạo role mới">
      <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Mã role</span>
          <Input placeholder="VD: SUPPORT" {...form.register('key')} />
          {errors.key && <span className="text-red-600">{errors.key.message}</span>}
        </label>
        <label className="space-y-1 text-sm">
          <span>Tên hiển thị</span>
          <Input placeholder="VD: Hỗ trợ khách hàng" {...form.register('name')} />
          {errors.name && <span className="text-red-600">{errors.name.message}</span>}
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Mô tả</span>
          <Input {...form.register('description')} />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={create.isPending}>
            Tạo role
          </Button>
          <p className="mt-2 text-sm text-slate-500">Role mới chỉ có quyền vào trang quản trị; chọn thêm quyền ở trang chi tiết.</p>
          <ErrorText error={create.error} />
        </div>
      </form>
    </Card>
  );
}
