'use client';

import {
  type AdminCategoryDto,
  type AdminSubjectDto,
  type CategoryField,
  type CategoryInput,
  type SubjectInput,
  categoryInputSchema,
  subjectInputSchema,
  toSlug,
} from '@elearning/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { z } from 'zod';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorText } from './error-text';
import { jsonBody, useAdminQuery } from './use-admin-api';

const TREE_KEY = ['admin', 'categories'] as const;
const FIELD_TYPE_LABELS = { text: 'Văn bản', number: 'Số', select: 'Lựa chọn' } as const;

/** Every write returns the whole tree, which replaces the cache. */
function useTreeMutation<T>(method: 'POST' | 'PATCH' | 'DELETE', path: (arg: T) => string, body?: (arg: T) => unknown) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arg: T) => authFetch<AdminCategoryDto[]>(path(arg), jsonBody(method, body?.(arg))),
    onSuccess: (tree) => {
      queryClient.setQueryData(TREE_KEY, tree);
      void queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
    },
  });
}

/** Validates with the shared schema; returns the parsed value or the first error message. */
function validate<S extends z.ZodType>(schema: S, value: unknown): { data: z.output<S> } | { error: string } {
  const result = schema.safeParse(value);
  return result.success ? { data: result.data } : { error: result.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
}

export function CategoriesAdmin() {
  const tree = useAdminQuery<AdminCategoryDto[]>(['categories'], '/admin/categories');
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <ErrorText error={tree.error} />
      {tree.isPending && <p className="text-sm text-slate-500">Đang tải...</p>}
      {tree.data?.map((c) => <CategoryCard key={c.id} category={c} />)}
      {adding ? (
        <Card title="Danh mục mới">
          <CategoryForm onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          + Thêm danh mục
        </Button>
      )}
    </div>
  );
}

function CategoryCard({ category: c }: { category: AdminCategoryDto }) {
  const [editing, setEditing] = useState(false);
  const remove = useTreeMutation<string>('DELETE', (id) => `/admin/categories/${id}`);

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {c.name}
          <code className="text-xs font-normal text-slate-400">{c.slug}</code>
          <Badge>{c.courseCount} khóa học</Badge>
        </span>
      }
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Đóng' : 'Sửa'}
          </Button>
          <Button
            variant="ghost"
            className="text-red-700"
            disabled={c.courseCount > 0 || c.subjects.length > 0 || remove.isPending}
            title="Chỉ xóa được danh mục trống"
            onClick={() => remove.mutate(c.id)}
          >
            Xóa
          </Button>
        </div>
      }
    >
      <ErrorText error={remove.error} />
      {editing ? (
        <CategoryForm category={c} onDone={() => setEditing(false)} />
      ) : (
        <>
          {c.description && <p className="mb-3 text-sm text-slate-600">{c.description}</p>}
          {c.courseFields.length > 0 && (
            <p className="mb-3 text-sm text-slate-600">
              Trường riêng của khóa học:{' '}
              {c.courseFields.map((f) => `${f.label}${f.required ? ' *' : ''}`).join(', ')}
            </p>
          )}
        </>
      )}
      <SubjectsTable category={c} />
    </Card>
  );
}

const emptyField = (): CategoryField => ({ key: '', label: '', type: 'text', options: [], required: false });

function CategoryForm({ category, onDone }: { category?: AdminCategoryDto; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [position, setPosition] = useState(String(category?.position ?? 0));
  const [fields, setFields] = useState<CategoryField[]>(category?.courseFields ?? []);
  const [error, setError] = useState<string | null>(null);
  const save = useTreeMutation<CategoryInput>(
    category ? 'PATCH' : 'POST',
    () => (category ? `/admin/categories/${category.id}` : '/admin/categories'),
    (input) => input,
  );

  const setField = (i: number, patch: Partial<CategoryField>) =>
    setFields((list) => list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const onSubmit = () => {
    const result = validate(categoryInputSchema, { name, slug, description: description || null, position, courseFields: fields });
    if ('error' in result) return setError(result.error);
    setError(null);
    save.mutate(result.data, { onSuccess: onDone });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <label className="space-y-1 text-sm">
          <span>Tên danh mục</span>
          <Input
            value={name}
            onChange={(e) => {
              if (!category && slug === toSlug(name)) setSlug(toSlug(e.target.value));
              setName(e.target.value);
            }}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Slug</span>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Thứ tự</span>
          <Input type="number" value={position} onChange={(e) => setPosition(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-3">
          <span>Mô tả</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Trường riêng khi tạo khóa học trong danh mục này</p>
        <p className="text-sm text-slate-500">VD: Hóa học cần chọn “Lớp”, Ngoại ngữ cần “Ngôn ngữ” và “Trình độ đầu ra”.</p>
        {fields.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-[8rem_1fr_8rem_1fr_auto_auto]">
            <Input placeholder="ma_truong" value={f.key} onChange={(e) => setField(i, { key: e.target.value })} />
            <Input placeholder="Tên hiển thị" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
            <Select value={f.type} onChange={(e) => setField(i, { type: e.target.value as CategoryField['type'] })}>
              {Object.entries(FIELD_TYPE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
            <Input
              placeholder={f.type === 'select' ? 'Lựa chọn, cách nhau bằng dấu phẩy' : '—'}
              disabled={f.type !== 'select'}
              value={f.options.join(', ')}
              onChange={(e) => setField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
            />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} />
              Bắt buộc
            </label>
            <Button variant="ghost" onClick={() => setFields((list) => list.filter((_, idx) => idx !== i))}>
              Xóa
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={() => setFields((list) => [...list, emptyField()])}>
          + Thêm trường
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <ErrorText error={save.error} />
      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={save.isPending}>
          Lưu danh mục
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Hủy
        </Button>
      </div>
    </div>
  );
}

function SubjectsTable({ category }: { category: AdminCategoryDto }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-600">
          <tr className="border-b border-slate-200">
            <th className="py-2 pr-2 font-medium">Môn học</th>
            <th className="py-2 pr-2 font-medium">Slug</th>
            <th className="w-20 py-2 pr-2 font-medium">Thứ tự</th>
            <th className="py-2 pr-2 font-medium">Đang mở</th>
            <th className="py-2 pr-2 font-medium">Khóa học</th>
            <th className="py-2 pr-2 font-medium">Giảng viên</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {category.subjects.map((s) => (
            <SubjectRow key={`${s.id}-${s.name}-${s.slug}-${s.position}-${s.isActive}`} subject={s} />
          ))}
          <SubjectRow categoryId={category.id} />
        </tbody>
      </table>
    </div>
  );
}

/** One editable row; without `subject` it is the "add subject" row. */
function SubjectRow({ subject, categoryId }: { subject?: AdminSubjectDto; categoryId?: string }) {
  const [name, setName] = useState(subject?.name ?? '');
  const [slug, setSlug] = useState(subject?.slug ?? '');
  const [position, setPosition] = useState(String(subject?.position ?? 0));
  const [isActive, setIsActive] = useState(subject?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const save = useTreeMutation<SubjectInput>(
    subject ? 'PATCH' : 'POST',
    () => (subject ? `/admin/subjects/${subject.id}` : `/admin/categories/${categoryId}/subjects`),
    (input) => input,
  );
  const remove = useTreeMutation<string>('DELETE', (id) => `/admin/subjects/${id}`);
  const dirty = !subject || name !== subject.name || slug !== subject.slug || position !== String(subject.position) || isActive !== subject.isActive;
  const inUse = !!subject && subject.courseCount + subject.instructorCount > 0;

  const onSave = () => {
    const result = validate(subjectInputSchema, { name, slug, position, isActive, description: subject?.description ?? null });
    if ('error' in result) return setError(result.error);
    setError(null);
    save.mutate(result.data, {
      onSuccess: () => {
        if (subject) return;
        setName('');
        setSlug('');
      },
    });
  };

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2 pr-2">
        <Input
          className="h-8"
          placeholder={subject ? undefined : 'Thêm môn học...'}
          value={name}
          onChange={(e) => {
            if (!subject && slug === toSlug(name)) setSlug(toSlug(e.target.value));
            setName(e.target.value);
          }}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ErrorText error={save.error ?? remove.error} />
      </td>
      <td className="py-2 pr-2">
        <Input className="h-8" value={slug} onChange={(e) => setSlug(e.target.value)} />
      </td>
      <td className="py-2 pr-2">
        <Input className="h-8" type="number" value={position} onChange={(e) => setPosition(e.target.value)} />
      </td>
      <td className="py-2 pr-2">
        <input type="checkbox" className="mt-2" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </td>
      <td className="py-2 pr-2 text-slate-600">{subject?.courseCount ?? ''}</td>
      <td className="py-2 pr-2 text-slate-600">{subject?.instructorCount ?? ''}</td>
      <td className="flex gap-1 py-2">
        <Button className="h-8" variant={subject ? 'outline' : 'primary'} disabled={!dirty || !name || save.isPending} onClick={onSave}>
          {subject ? 'Lưu' : 'Thêm'}
        </Button>
        {subject && (
          <Button
            className="h-8 text-red-700"
            variant="ghost"
            disabled={inUse || remove.isPending}
            title={inUse ? 'Môn đã có khóa học hoặc giảng viên: bỏ "Đang mở" thay vì xóa' : undefined}
            onClick={() => remove.mutate(subject.id)}
          >
            Xóa
          </Button>
        )}
      </td>
    </tr>
  );
}
