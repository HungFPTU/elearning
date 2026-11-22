import { Suspense } from 'react';
import { UserDetail } from '@/components/admin/user-detail';

async function UserDetailFromParams({ params }: { params: PageProps<'/admin/users/[id]'>['params'] }) {
  const { id } = await params;
  return <UserDetail id={id} />;
}

export default function AdminUserPage({ params }: PageProps<'/admin/users/[id]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
      <UserDetailFromParams params={params} />
    </Suspense>
  );
}
