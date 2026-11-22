'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginInput, loginSchema, type RegisterInput, registerSchema } from '@elearning/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type FieldValues, type Path, useForm } from 'react-hook-form';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';

function Field<T extends FieldValues>({
  form,
  name,
  label,
  type = 'text',
}: {
  form: ReturnType<typeof useForm<T>>;
  name: Path<T>;
  label: string;
  type?: string;
}) {
  const error = form.formState.errors[name]?.message;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input type={type} {...form.register(name)} aria-invalid={!!error} />
      {typeof error === 'string' && <span className="text-red-600">{error}</span>}
    </label>
  );
}

function useSubmit<T>(action: (values: T) => Promise<void>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (values: T) => {
    setError(null);
    try {
      await action(values);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể kết nối máy chủ');
    }
  };
  return { error, onSubmit };
}

export function LoginForm() {
  const { login } = useAuth();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const { error, onSubmit } = useSubmit(login);
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field form={form} name="email" label="Email" type="email" />
      <Field form={form} name="password" label="Mật khẩu" type="password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Đăng nhập
      </Button>
      <p className="text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-indigo-600 hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const { register } = useAuth();
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const { error, onSubmit } = useSubmit(register);
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field form={form} name="fullName" label="Họ và tên" />
      <Field form={form} name="email" label="Email" type="email" />
      <Field form={form} name="password" label="Mật khẩu" type="password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Tạo tài khoản
      </Button>
      <p className="text-center text-sm text-slate-500">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-indigo-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
