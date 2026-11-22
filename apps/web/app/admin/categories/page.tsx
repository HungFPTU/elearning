import { CategoriesAdmin } from '@/components/admin/categories-admin';

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Danh mục và môn học</h1>
      <p className="text-sm text-slate-600">
        Danh mục chứa các môn học. Giảng viên được duyệt theo từng môn và chỉ tạo khóa học trong môn được duyệt.
      </p>
      <CategoriesAdmin />
    </div>
  );
}
