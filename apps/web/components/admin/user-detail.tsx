'use client';

import {
  type AdminUserDetailDto,
  PERMISSIONS,
  PERMISSION_KEYS,
  type PermissionKey,
  type RoleDto,
  Role,
  type SetUserOverridesInput,
} from '@elearning/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { SubjectPicker } from '@/components/catalog/subject-picker';
import { useCategoryTree } from '@/components/catalog/use-category-tree';
import { ErrorText } from './error-text';
import { RoleBadge, StatusBadge } from './role-badge';
import { jsonBody, useAdminQuery } from './use-admin-api';

type Detail = AdminUserDetailDto;

/** Saves a change and puts the fresh user into the cache. */
function useUserMutation<TInput>(id: string, path: string, method: 'PATCH' | 'PUT') {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => authFetch<Detail>(`/admin/users/${id}${path}`, jsonBody(method, input)),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'user', id], data);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
  });
}

export function UserDetail({ id }: { id: string }) {
  const user = useAdminQuery<Detail>(['user', id], `/admin/users/${id}`);

  if (user.isPending) return <p className="text-sm text-slate-500">Đang tải...</p>;
  if (user.error) return <ErrorText error={user.error} />;
  const u = user.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-indigo-700 hover:underline">
          ← Danh sách người dùng
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{u.fullName}</h1>
          <RoleBadge role={u.role} />
          <StatusBadge status={u.status} />
        </div>
        <p className="text-slate-600">
          {u.email} · Tham gia {formatDate(u.createdAt)} · {u.courseCount} khóa học đã tạo · {u.enrollmentCount} khóa học đã
          mua
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RoleCard user={u} />
        <StatusCard user={u} />
      </div>
      <TeachingSubjectsCard key={u.teachingSubjects.map((t) => t.id).join()} user={u} />
      <OverridesCard key={JSON.stringify(u.overrides)} user={u} />
    </div>
  );
}

function RoleCard({ user }: { user: Detail }) {
  const { can } = useAuth();
  const roles = useAdminQuery<RoleDto[]>(['roles'], '/admin/roles');
  const [roleKey, setRoleKey] = useState(user.role.key);
  const save = useUserMutation<{ roleKey: string }>(user.id, '/role', 'PATCH');
  const editable = can('user.assign_role');

  return (
    <Card title="Role">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={roleKey} onChange={(e) => setRoleKey(e.target.value)} disabled={!editable}>
          {roles.data?.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </Select>
        {editable && (
          <Button disabled={roleKey === user.role.key || save.isPending} onClick={() => save.mutate({ roleKey })}>
            Lưu role
          </Button>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Người dùng nhận mọi quyền của role. Chỉ Chủ sở hữu mới cấp hoặc gỡ role Quản trị viên và Chủ sở hữu.
      </p>
      <ErrorText error={save.error} />
    </Card>
  );
}

function StatusCard({ user }: { user: Detail }) {
  const { can, user: me } = useAuth();
  const [reason, setReason] = useState('');
  const save = useUserMutation<{ status: string; reason?: string }>(user.id, '/status', 'PATCH');
  const locked = user.status === 'LOCKED';
  const editable = can('user.lock') && me?.id !== user.id && user.role.key !== Role.OWNER;

  return (
    <Card title="Trạng thái tài khoản">
      {locked ? (
        <p className="mb-3 text-sm">Tài khoản đang bị khóa: không đăng nhập được, mọi phiên đã bị đăng xuất.</p>
      ) : (
        <p className="mb-3 text-sm">Tài khoản đang hoạt động.</p>
      )}
      {editable && (
        <div className="flex flex-wrap gap-2">
          {!locked && (
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do khóa (không bắt buộc)" className="max-w-xs" />
          )}
          <Button
            variant={locked ? 'primary' : 'outline'}
            className={locked ? undefined : 'border-red-300 text-red-700 hover:bg-red-50'}
            disabled={save.isPending}
            onClick={() => save.mutate(locked ? { status: 'ACTIVE' } : { status: 'LOCKED', reason: reason || undefined })}
          >
            {locked ? 'Mở khóa' : 'Khóa tài khoản'}
          </Button>
        </div>
      )}
      <ErrorText error={save.error} />
    </Card>
  );
}

type OverrideChoice = 'INHERIT' | 'GRANT' | 'DENY';

const GROUPS = [...new Set(PERMISSION_KEYS.map((k) => PERMISSIONS[k].group))];

function OverridesCard({ user }: { user: Detail }) {
  const { can } = useAuth();
  const isOwnerTarget = user.role.key === Role.OWNER;
  const editable = can('role.manage') && !isOwnerTarget;
  const [draft, setDraft] = useState<Partial<Record<PermissionKey, { effect: OverrideChoice; reason: string }>>>(() =>
    Object.fromEntries(user.overrides.map((o) => [o.permissionKey, { effect: o.effect, reason: o.reason ?? '' }])),
  );
  const save = useUserMutation<SetUserOverridesInput>(user.id, '/overrides', 'PUT');

  const choiceOf = (key: PermissionKey): OverrideChoice => draft[key]?.effect ?? 'INHERIT';
  const setChoice = (key: PermissionKey, effect: OverrideChoice) =>
    setDraft((d) => ({ ...d, [key]: { effect, reason: d[key]?.reason ?? '' } }));
  const setReason = (key: PermissionKey, reason: string) =>
    setDraft((d) => ({ ...d, [key]: { effect: d[key]?.effect ?? 'INHERIT', reason } }));

  const onSave = () =>
    save.mutate({
      overrides: PERMISSION_KEYS.flatMap((key) => {
        const entry = draft[key];
        if (!entry || entry.effect === 'INHERIT') return [];
        return [{ permissionKey: key, effect: entry.effect, reason: entry.reason.trim() || undefined }];
      }),
    });

  return (
    <Card
      title="Quyền"
      actions={
        editable && (
          <Button onClick={onSave} disabled={save.isPending}>
            Lưu quyền riêng
          </Button>
        )
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        {isOwnerTarget
          ? 'Chủ sở hữu luôn có mọi quyền.'
          : 'Mặc định người dùng theo quyền của role. Chọn "Cho phép" hoặc "Chặn" để ghi đè riêng cho người này; "Chặn" luôn thắng.'}
      </p>
      <ErrorText error={save.error} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">Quyền</th>
              <th className="py-2 pr-4 font-medium">Theo role</th>
              <th className="py-2 pr-4 font-medium">Ghi đè</th>
              <th className="py-2 pr-4 font-medium">Thực tế</th>
            </tr>
          </thead>
          {GROUPS.map((group) => (
            <tbody key={group}>
              <tr>
                <td colSpan={4} className="pt-4 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {group}
                </td>
              </tr>
              {PERMISSION_KEYS.filter((k) => PERMISSIONS[k].group === group).map((key) => (
                <tr key={key} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4">
                    <div>{PERMISSIONS[key].label}</div>
                    <code className="text-xs text-slate-400">{key}</code>
                  </td>
                  <td className="py-2 pr-4">{user.rolePermissions.includes(key) ? '✓' : '–'}</td>
                  <td className="py-2 pr-4">
                    <Select
                      value={choiceOf(key)}
                      disabled={!editable}
                      onChange={(e) => setChoice(key, e.target.value as OverrideChoice)}
                      className="h-8"
                    >
                      <option value="INHERIT">Theo role</option>
                      <option value="GRANT">Cho phép</option>
                      <option value="DENY">Chặn</option>
                    </Select>
                    {choiceOf(key) !== 'INHERIT' && (
                      <Input
                        value={draft[key]?.reason ?? ''}
                        disabled={!editable}
                        onChange={(e) => setReason(key, e.target.value)}
                        placeholder="Lý do"
                        className="mt-1 h-8"
                      />
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {user.effectivePermissions.includes(key) ? (
                      <span className="text-emerald-700">Có</span>
                    ) : (
                      <span className="text-slate-400">Không</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </Card>
  );
}

function TeachingSubjectsCard({ user }: { user: Detail }) {
  const { can, authFetch } = useAuth();
  const queryClient = useQueryClient();
  const tree = useCategoryTree();
  const [selected, setSelected] = useState(() => user.teachingSubjects.map((t) => t.id));
  const editable = can('instructor_application.review');
  const save = useMutation({
    mutationFn: () => authFetch(`/admin/users/${user.id}/subjects`, jsonBody('PUT', { subjectIds: selected })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'user', user.id] }),
  });
  const dirty = selected.slice().sort().join() !== user.teachingSubjects.map((t) => t.id).sort().join();

  return (
    <Card
      title="Môn được dạy"
      actions={
        editable && (
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            Lưu môn
          </Button>
        )
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        Giảng viên chỉ tạo được khóa học trong các môn này. Thường được cấp khi duyệt đơn giảng viên; chỉnh tay ở đây khi cần.
      </p>
      {tree.data && <SubjectPicker categories={tree.data} value={selected} onChange={setSelected} disabled={!editable} />}
      <ErrorText error={save.error} />
    </Card>
  );
}
