import { COURSE_LEVEL_LABELS } from '@elearning/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Price } from '@/components/course/price';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

async function loadCourse(slug: string) {
  try {
    return await api.getCourse(slug);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps<'/courses/[slug]'>): Promise<Metadata> {
  const course = await loadCourse((await params).slug);
  return { title: course.title, description: course.subtitle ?? undefined };
}

async function CourseDetail({ params }: { params: PageProps<'/courses/[slug]'>['params'] }) {
  const course = await loadCourse((await params).slug);
  return (
    <>
      <section className="bg-slate-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_320px]">
          <div>
            {course.category && <p className="text-sm text-indigo-300">{course.category.name}</p>}
            <h1 className="mt-2 text-3xl font-bold">{course.title}</h1>
            {course.subtitle && <p className="mt-3 text-lg text-slate-300">{course.subtitle}</p>}
            <p className="mt-4 text-sm text-slate-400">
              Giảng viên: <span className="text-white">{course.instructor.fullName}</span> · {COURSE_LEVEL_LABELS[course.level]} ·{' '}
              {course.lessonCount} bài học · {formatDuration(course.totalDurationSeconds)}
            </p>
          </div>
          <aside className="rounded-lg bg-white p-6 text-slate-900 shadow-lg">
            <div className="text-2xl">
              <Price price={course.price} salePrice={course.salePrice} />
            </div>
            {/* Cart + checkout land in milestone 3. */}
            <Button className="mt-4 w-full" disabled>
              Thêm vào giỏ hàng (sắp có)
            </Button>
          </aside>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-10 lg:pr-[352px]">
        <h2 className="mb-3 text-xl font-bold">Mô tả khóa học</h2>
        <p className="whitespace-pre-line text-slate-700">{course.description}</p>

        <h2 className="mb-3 mt-10 text-xl font-bold">Nội dung khóa học</h2>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {course.sections.map((section) => (
            <details key={section.id} className="group" open>
              <summary className="cursor-pointer px-4 py-3 font-medium">
                {section.title} <span className="text-sm font-normal text-slate-500">· {section.lessons.length} bài</span>
              </summary>
              <ul className="px-4 pb-3">
                {section.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex justify-between py-1.5 text-sm">
                    <span>
                      {lesson.title}
                      {lesson.isPreview && <span className="ml-2 text-xs font-medium text-indigo-600">Học thử</span>}
                    </span>
                    <span className="text-slate-500">{formatDuration(lesson.durationSeconds)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

export default function CourseDetailPage({ params }: PageProps<'/courses/[slug]'>) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-slate-500">Đang tải...</p>}>
      <CourseDetail params={params} />
    </Suspense>
  );
}
