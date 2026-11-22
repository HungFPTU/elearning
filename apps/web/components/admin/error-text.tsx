import { ApiError } from '@/lib/api';

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : 'Đã có lỗi xảy ra';
  return <p className="text-sm text-red-600">{message}</p>;
}
