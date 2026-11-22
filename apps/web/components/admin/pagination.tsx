import { Button } from '@/components/ui/button';

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-slate-600">
      <span>
        {total} kết quả · Trang {page}/{pages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Trước
        </Button>
        <Button variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Sau
        </Button>
      </div>
    </div>
  );
}
