import Link from 'next/link';
import { Suspense } from 'react';
import { CourseGrid } from '@/components/course/course-card';
import { buttonClasses } from '@/components/ui/button';
import { api } from '@/lib/api';

async function NewestCourses() {
  const { items } = await api.listCourses({ pageSize: '8', sort: 'newest' });
  return <CourseGrid courses={items} />;
}

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Học kỹ năng mới, mở ra cơ hội mới</h1>
          <p className="mt-4 max-w-xl text-lg text-indigo-100">
            Khóa học video từ giảng viên thực chiến. Học mọi lúc, mọi nơi, sở hữu trọn đời.
          </p>
          <Link href="/courses" className={buttonClasses('outline', 'mt-8 text-slate-900')}>
            Khám phá khóa học
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">Khóa học mới nhất</h2>
        <Suspense fallback={<p className="text-slate-500">Đang tải khóa học...</p>}>
          <NewestCourses />
        </Suspense>
      </section>
    </>
  );
}
