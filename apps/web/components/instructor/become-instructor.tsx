'use client';

import {
  type InstructorApplicationDto,
  type SubmitApplicationInput,
  type TeachingSubjectDto,
  submitApplicationSchema,
} from '@elearning/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ErrorText } from '@/components/admin/error-text';
import { SubjectPicker } from '@/components/catalog/subject-picker';
import { useCategoryTree } from '@/components/catalog/use-category-tree';
import { useAuth } from '@/components/providers/auth-provider';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { ApplicationStatusBadge, ApplicationSubjects } from './application-status';

const MY_APPS = ['me', 'instructor-applications'] as const;
const textareaClass =
  'min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

export function BecomeInstructor() {
  const { user, isLoading, authFetch, can } = useAuth();
  const apps = useQuery({
    queryKey: MY_APPS,
    queryFn: () => authFetch<InstructorApplicationDto[]>('/me/instructor-applications'),
    enabled: !!user,
  });
  const teaching = useQuery({
    queryKey: ['me', 'teaching-subjects'],
    queryFn: () => authFetch<TeachingSubjectDto[]>('/me/teaching-subjects'),
    enabled: !!user,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Đang tải...</p>;
  if (!user) {
    return (
      <Card>
        <p className="mb-3">Đăng nhập để gửi đơn đăng ký giảng viên.</p>
        <Link href="/login" className={buttonClasses('primary')}>
          Đăng nhập
        </Link>
      </Card>
    );
  }

  const pending = apps.data?.find((a) => a.status === 'PENDING');
  return (
    <div className="space-y-6">
      {teaching.data && teaching.data.length > 0 && (
        <Card title="Môn bạn đang được dạy">
          <div className="flex flex-wrap gap-2 text-sm">
            {teaching.data.map((s) => (
              <span key={s.id} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {s.category.name} · {s.name}
              </span>
            ))}
          </div>
        </Card>
      )}
      {pending ? (
        <Card title="Đơn đang chờ duyệt">
          <p className="text-sm text-slate-600">Bạn sẽ nhận kết quả sau khi quản trị viên xem xét. Mỗi lúc chỉ có một đơn chờ duyệt.</p>
        </Card>
      ) : can('instructor_application.submit') ? (
        <ApplicationForm teachingIds={teaching.data?.map((s) => s.id) ?? []} />
      ) : (
        <Card>
          <p className="text-sm text-slate-600">Tài khoản của bạn hiện không thể gửi đơn đăng ký giảng viên.</p>
        </Card>
      )}
      {apps.data && apps.data.length > 0 && <MyApplications applications={apps.data} />}
    </div>
  );
}

type FormInput = z.input<typeof submitApplicationSchema>;

function ApplicationForm({ teachingIds }: { teachingIds: string[] }) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const tree = useCategoryTree();
  const form = useForm<FormInput, unknown, SubmitApplicationInput>({
    resolver: zodResolver(submitApplicationSchema),
    defaultValues: { subjectIds: [], headline: '', bio: '', experience: '', links: [] },
  });
  const submit = useMutation({
    mutationFn: (input: SubmitApplicationInput) =>
      authFetch<InstructorApplicationDto>('/me/instructor-applications', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      form.reset();
      void queryClient.invalidateQueries({ queryKey: MY_APPS });
    },
  });
  const { errors } = form.formState;

  return (
    <Card title="Đăng ký dạy">
      <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-5" noValidate>
        <div>
          <p className="mb-2 text-sm font-medium">Môn muốn dạy</p>
          <p className="mb-3 text-sm text-slate-500">
            Bạn chỉ tạo được khóa học trong những môn được duyệt. Muốn dạy thêm môn thì gửi đơn mới.
          </p>
          {tree.data && (
            <Controller
              control={form.control}
              name="subjectIds"
              render={({ field }) => (
                <SubjectPicker categories={tree.data} value={field.value} onChange={field.onChange} disabledIds={teachingIds} />
              )}
            />
          )}
          {errors.subjectIds && <p className="mt-1 text-sm text-red-600">{errors.subjectIds.message}</p>}
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Giới thiệu ngắn</span>
          <Input placeholder="VD: Giáo viên Hóa THPT, 10 năm luyện thi" {...form.register('headline')} />
          {errors.headline && <span className="text-red-600">{errors.headline.message}</span>}
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Giới thiệu bản thân</span>
          <textarea className={textareaClass} {...form.register('bio')} />
          {errors.bio && <span className="text-red-600">{errors.bio.message}</span>}
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Kinh nghiệm giảng dạy</span>
          <textarea className={textareaClass} {...form.register('experience')} />
          {errors.experience && <span className="text-red-600">{errors.experience.message}</span>}
        </label>
        <Controller
          control={form.control}
          name="links"
          render={({ field }) => (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Link hồ sơ, bài giảng mẫu, chứng chỉ (mỗi dòng một link)</span>
              <textarea
                className={textareaClass}
                defaultValue={(field.value ?? []).join('\n')}
                onChange={(e) => field.onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
              />
              {errors.links && <span className="text-red-600">Có link không hợp lệ (tối đa 5 link, bắt đầu bằng https://)</span>}
            </label>
          )}
        />
        <ErrorText error={submit.error} />
        <Button type="submit" disabled={submit.isPending}>
          Gửi đơn
        </Button>
      </form>
    </Card>
  );
}

function MyApplications({ applications }: { applications: InstructorApplicationDto[] }) {
  return (
    <Card title="Đơn đã gửi">
      <ul className="divide-y divide-slate-100">
        {applications.map((a) => (
          <li key={a.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={a.status} />
              <span className="text-sm text-slate-500">Gửi ngày {formatDate(a.createdAt)}</span>
            </div>
            <ApplicationSubjects subjects={a.subjects} />
            {a.reviewNote && <p className="text-sm text-slate-600">Phản hồi: {a.reviewNote}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
