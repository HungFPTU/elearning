'use client';

import {
  APPLICATION_STATUS_LABELS,
  type AdminInstructorApplicationDto,
  type ApplicationStatus,
  type Paginated,
} from '@elearning/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ApplicationStatusBadge, ApplicationSubjects } from '@/components/instructor/application-status';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { ErrorText } from './error-text';
import { Pagination } from './pagination';
import { RoleBadge } from './role-badge';
import { jsonBody, toQueryString, useAdminQuery } from './use-admin-api';

const TABS: ApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export function InstructorApplications() {
  const [status, setStatus] = useState<ApplicationStatus>('PENDING');
  const [page, setPage] = useState(1);
  const qs = toQueryString({ status, page, pageSize: 20 });
  const apps = useAdminQuery<Paginated<AdminInstructorApplicationDto>>(['instructor-applications', qs], `/admin/instructor-applications?${qs}`);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setStatus(t);
              setPage(1);
            }}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm',
              t === status ? 'border-indigo-600 font-medium text-indigo-700' : 'border-transparent text-slate-600',
            )}
          >
            {APPLICATION_STATUS_LABELS[t]}
          </button>
        ))}
      </div>
      <ErrorText error={apps.error} />
      {apps.isPending && <p className="text-sm text-slate-500">Đang tải...</p>}
      {apps.data?.items.length === 0 && <p className="py-8 text-center text-slate-500">Không có đơn nào</p>}
      <div className="space-y-4">
        {apps.data?.items.map((a) => <ApplicationCard key={a.id} application={a} />)}
      </div>
      {apps.data && apps.data.total > apps.data.pageSize && (
        <Pagination page={apps.data.page} pageSize={apps.data.pageSize} total={apps.data.total} onChange={setPage} />
      )}
    </div>
  );
}

function ApplicationCard({ application: a }: { application: AdminInstructorApplicationDto }) {
  const { authFetch, user } = useAuth();
  const queryClient = useQueryClient();
  const [approved, setApproved] = useState(() => a.subjects.map((s) => s.id));
  const [note, setNote] = useState('');
  const decide = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      authFetch<AdminInstructorApplicationDto>(
        `/admin/instructor-applications/${a.id}/${action}`,
        jsonBody('POST', action === 'approve' ? { subjectIds: approved, note: note || undefined } : { note }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'instructor-applications'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
  const pending = a.status === 'PENDING';
  const own = user?.id === a.user.id;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/users/${a.user.id}`} className="font-semibold text-indigo-700 hover:underline">
          {a.user.fullName}
        </Link>
        <span className="text-sm text-slate-500">{a.user.email}</span>
        <RoleBadge role={a.user.role} />
        <ApplicationStatusBadge status={a.status} />
        <span className="ml-auto text-sm text-slate-500">Gửi {formatDateTime(a.createdAt)}</span>
      </header>
      <p className="mt-2 font-medium">{a.headline}</p>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Giới thiệu</h3>
          <p className="text-sm whitespace-pre-line">{a.bio}</p>
        </section>
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Kinh nghiệm</h3>
          <p className="text-sm whitespace-pre-line">{a.experience}</p>
        </section>
      </div>
      {a.links.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {a.links.map((l) => (
            <li key={l}>
              <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-700 hover:underline">
                {l}
              </a>
            </li>
          ))}
        </ul>
      )}
      {a.currentSubjects.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          Đang dạy: {a.currentSubjects.map((s) => `${s.category.name} · ${s.name}`).join(', ')}
        </p>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4">
        {pending ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Môn xin dạy (bỏ chọn môn không duyệt)</p>
            <div className="flex flex-wrap gap-3">
              {a.subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={approved.includes(s.id)}
                    onChange={() =>
                      setApproved((v) => (v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id]))
                    }
                  />
                  {s.category.name} · {s.name}
                </label>
              ))}
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú cho người gửi (bắt buộc khi từ chối)" />
            {own ? (
              <p className="text-sm text-slate-500">Bạn không thể tự duyệt đơn của mình.</p>
            ) : (
              <div className="flex gap-2">
                <Button disabled={approved.length === 0 || decide.isPending} onClick={() => decide.mutate('approve')}>
                  Duyệt {approved.length < a.subjects.length ? `${approved.length} môn` : ''}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  disabled={note.trim().length < 5 || decide.isPending}
                  onClick={() => decide.mutate('reject')}
                >
                  Từ chối
                </Button>
              </div>
            )}
            <ErrorText error={decide.error} />
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <ApplicationSubjects subjects={a.subjects} />
            <p className="text-slate-600">
              {a.reviewedBy ? `${a.reviewedBy.fullName} xử lý` : 'Đã xử lý'}
              {a.reviewedAt && ` ngày ${formatDate(a.reviewedAt)}`}
              {a.reviewNote && `: ${a.reviewNote}`}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
