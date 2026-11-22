import { COURSE_LEVEL_LABELS, type CourseLevel } from '@elearning/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CourseGrid } from '@/components/course/course-card';
import { buttonClasses } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'Tất cả khóa học' };

type Search = Record<string, string | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Filters({ search }: { search: Search }) {
  const categories = await api.listCategories();
  return (
    <form className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <Input name="q" defaultValue={search.q} placeholder="Tìm khóa học..." />
      <select name="category" defaultValue={search.category ?? ''} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
        <option value="">Tất cả danh mục</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="level" defaultValue={search.level ?? ''} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
        <option value="">Mọi cấp độ</option>
        {(Object.keys(COURSE_LEVEL_LABELS) as CourseLevel[]).map((l) => (
          <option key={l} value={l}>
            {COURSE_LEVEL_LABELS[l]}
          </option>
        ))}
      </select>
      <select name="sort" defaultValue={search.sort ?? 'newest'} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
        <option value="newest">Mới nhất</option>
        <option value="price_asc">Giá tăng dần</option>
        <option value="price_desc">Giá giảm dần</option>
      </select>
      <button type="submit" className={buttonClasses('primary')}>
        Lọc
      </button>
    </form>
  );
}

async function Results({ search }: { search: Search }) {
  const data = await api.listCourses({ ...search, pageSize: '12' });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const pageHref = (page: number) => `/courses?${new URLSearchParams({ ...stripEmpty(search), page: String(page) }).toString()}`;
  return (
    <>
      <p className="mb-4 text-sm text-slate-500">{data.total} khóa học</p>
      <CourseGrid courses={data.items} />
      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={pageHref(p)} className={buttonClasses(p === data.page ? 'primary' : 'outline', 'w-10 px-0')}>
              {p}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

function stripEmpty(search: Search): Record<string, string> {
  return Object.fromEntries(Object.entries(search).filter((e): e is [string, string] => !!e[1]));
}

async function CoursesContent({ searchParams }: { searchParams: PageProps<'/courses'>['searchParams'] }) {
  const raw = await searchParams;
  const search: Search = {
    q: first(raw.q),
    category: first(raw.category),
    subject: first(raw.subject),
    level: first(raw.level),
    sort: first(raw.sort),
    page: first(raw.page),
  };
  return (
    <>
      <Filters search={search} />
      <Results search={search} />
    </>
  );
}

export default function CoursesPage({ searchParams }: PageProps<'/courses'>) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Tất cả khóa học</h1>
      <Suspense fallback={<p className="text-slate-500">Đang tải...</p>}>
        <CoursesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
