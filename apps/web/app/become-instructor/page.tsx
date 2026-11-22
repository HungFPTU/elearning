import type { Metadata } from 'next';
import { BecomeInstructor } from '@/components/instructor/become-instructor';

export const metadata: Metadata = { title: 'Trở thành giảng viên' };

export default function BecomeInstructorPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">Trở thành giảng viên</h1>
        <p className="mt-2 text-slate-600">
          Chọn môn bạn muốn dạy và giới thiệu về mình. Sau khi được duyệt, bạn có thể tạo khóa học trong các môn đó.
        </p>
      </div>
      <BecomeInstructor />
    </div>
  );
}
