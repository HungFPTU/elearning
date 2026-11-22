'use client';

import { PERMISSIONS, PERMISSION_KEYS, type PermissionKey, Role, type RoleDto } from '@elearning/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText } from './error-text';
import { jsonBody, useAdminQuery } from './use-admin-api';

const GROUPS = [...new Set(PERMISSION_KEYS.map((k) => PERMISSIONS[k].group))];
const PRIVILEGED: string[] = [Role.ADMIN, Role.OWNER];

export function RoleDetail({ roleKey }: { roleKey: string }) {
  const role = useAdminQuery<RoleDto>(['role', roleKey], `/admin/roles/${roleKey}`);
  if (role.isPending) return <p className="text-sm text-slate-500">Đang tải...</p>;
  if (role.error) return <ErrorText error={role.error} />;
  return <RoleEditor key={role.data.permissions.join()} role={role.data} />;
}

function RoleEditor({ role }: { role: RoleDto }) {
  const { authFetch, can, user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set<PermissionKey>(role.permissions));

  const isOwnerRole = role.key === Role.OWNER;
  const editable = can('role.manage') && !isOwnerRole && (user?.role === Role.OWNER || !PRIVILEGED.includes(role.key));

  const save = useMutation({
    mutationFn: () =>
      authFetch<RoleDto>(`/admin/roles/${role.key}/permissions`, jsonBody('PUT', { permissions: [...selected] })),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'role', role.key], data);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => authFetch<void>(`/admin/roles/${role.key}`, jsonBody('DELETE')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      router.push('/admin/roles');
    },
  });

  const toggle = (key: PermissionKey) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/roles" className="text-sm text-indigo-700 hover:underline">
          ← Danh sách role
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{role.name}</h1>
          {role.isSystem ? <Badge>Hệ thống</Badge> : <Badge tone="indigo">Tùy chỉnh</Badge>}
        </div>
        <p className="text-slate-600">
          <code>{role.key}</code> · {role.userCount} người dùng
        </p>
      </div>

      <Card
        title="Quyền của role"
        actions={
          editable && (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Lưu thay đổi
            </Button>
          )
        }
      >
        {isOwnerRole && <p className="mb-3 text-sm text-slate-500">Chủ sở hữu luôn có mọi quyền, không chỉnh được.</p>}
        {!editable && !isOwnerRole && <p className="mb-3 text-sm text-slate-500">Bạn chỉ được xem role này.</p>}
        <ErrorText error={save.error} />
        <div className="space-y-4">
          {GROUPS.map((group) => (
            <fieldset key={group}>
              <legend className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{group}</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {PERMISSION_KEYS.filter((k) => PERMISSIONS[k].group === group).map((key) => (
                  <label key={key} className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={isOwnerRole || selected.has(key)}
                      disabled={!editable}
                      onChange={() => toggle(key)}
                    />
                    <span>
                      {PERMISSIONS[key].label}
                      <code className="block text-xs text-slate-400">{key}</code>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Card>

      {can('role.manage') && !role.isSystem && (
        <Card title="Xóa role">
          <p className="mb-3 text-sm text-slate-600">Chỉ xóa được khi không còn người dùng nào giữ role này.</p>
          <Button
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            disabled={role.userCount > 0 || remove.isPending}
            onClick={() => remove.mutate()}
          >
            Xóa role
          </Button>
          <ErrorText error={remove.error} />
        </Card>
      )}
    </div>
  );
}
