import { AuditLogTable } from '@/components/admin/audit-log-table';

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nhật ký thao tác</h1>
      <AuditLogTable />
    </div>
  );
}
