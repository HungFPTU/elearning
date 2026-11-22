import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Không tìm thấy trang</h1>
      <p className="mt-2 text-slate-500">Trang bạn tìm không tồn tại hoặc đã bị xóa.</p>
      <Link href="/" className={buttonClasses('primary', 'mt-6')}>
        Về trang chủ
      </Link>
    </div>
  );
}
