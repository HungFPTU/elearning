import { RolesList } from '@/components/admin/roles-list';

export default function AdminRolesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Role và quyền</h1>
      <RolesList />
    </div>
  );
}
