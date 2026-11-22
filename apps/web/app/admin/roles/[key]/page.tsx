import { Suspense } from 'react';
import { RoleDetail } from '@/components/admin/role-detail';

async function RoleDetailFromParams({ params }: { params: PageProps<'/admin/roles/[key]'>['params'] }) {
  const { key } = await params;
  return <RoleDetail roleKey={key} />;
}

export default function AdminRolePage({ params }: PageProps<'/admin/roles/[key]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
      <RoleDetailFromParams params={params} />
    </Suspense>
  );
}
