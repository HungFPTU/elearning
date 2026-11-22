import { InstructorApplications } from '@/components/admin/instructor-applications';

export default function AdminInstructorApplicationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Đơn đăng ký giảng viên</h1>
      <InstructorApplications />
    </div>
  );
}
