import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/auth-form';

export const metadata: Metadata = { title: 'Đăng ký' };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Tạo tài khoản</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <RegisterForm />
      </div>
    </div>
  );
}
