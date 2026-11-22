'use client';

import { AUDIT_ACTION_LABELS, type AuditLogDto, type Paginated } from '@elearning/shared';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { Select } from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import { ErrorText } from './error-text';
import { Pagination } from './pagination';
import { toQueryString, useAdminQuery } from './use-admin-api';

const PAGE_SIZE = 30;

const json = (value: unknown) => (value === null || value === undefined ? '–' : JSON.stringify(value, null, 2));

export function AuditLogTable() {
  const [filters, setFilters] = useState({ action: '', page: 1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const qs = toQueryString({ ...filters, pageSize: PAGE_SIZE });
  const logs = useAdminQuery<Paginated<AuditLogDto>>(['audit-logs', qs], `/admin/audit-logs?${qs}`);

  return (
    <div className="space-y-4">
      <Select value={filters.action} onChange={(e) => setFilters({ action: e.target.value, page: 1 })}>
        <option value="">Mọi thao tác</option>
        {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>

      <ErrorText error={logs.error} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Thời gian</th>
              <th className="px-4 py-2 font-medium">Người thực hiện</th>
              <th className="px-4 py-2 font-medium">Thao tác</th>
              <th className="px-4 py-2 font-medium">Đối tượng</th>
              <th className="px-4 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.isPending && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}
            {logs.data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Chưa có nhật ký nào
                </td>
              </tr>
            )}
            {logs.data?.items.map((log) => (
              <Fragment key={log.id}>
                <tr
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => setOpenId(openId === log.id ? null : log.id)}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-slate-600">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2">
                    {log.actor ? (
                      <Link
                        href={`/admin/users/${log.actor.id}`}
                        className="text-indigo-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {log.actor.fullName}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Ẩn danh</span>
                    )}
                    {log.actorRole && <span className="ml-1 text-xs text-slate-400">({log.actorRole})</span>}
                  </td>
                  <td className="px-4 py-2">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</td>
                  <td className="px-4 py-2">
                    {log.targetType === 'user' && log.targetId ? (
                      <Link
                        href={`/admin/users/${log.targetId}`}
                        className="text-indigo-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        user
                      </Link>
                    ) : (
                      (log.targetType ?? '–')
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{log.ip ?? '–'}</td>
                </tr>
                {openId === log.id && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-slate-500">Trước</div>
                          <pre className="overflow-x-auto rounded bg-white p-2 text-xs">{json(log.before)}</pre>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-semibold text-slate-500">Sau</div>
                          <pre className="overflow-x-auto rounded bg-white p-2 text-xs">{json(log.after)}</pre>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Thiết bị: {log.userAgent ?? '–'}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {logs.data && (
        <Pagination
          page={logs.data.page}
          pageSize={logs.data.pageSize}
          total={logs.data.total}
          onChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
    </div>
  );
}
