import Link from 'next/link';
import { COURSE_LEVEL_LABELS, type CourseSummaryDto } from '@elearning/shared';
import { Price } from './price';

export function CourseCard({ course }: { course: CourseSummaryDto }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 p-4 text-center text-lg font-semibold text-white">
        {course.title}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 font-semibold group-hover:text-indigo-600">{course.title}</h3>
        <p className="text-sm text-slate-500">{course.instructor.fullName}</p>
        <p className="text-xs text-slate-500">
          {COURSE_LEVEL_LABELS[course.level]} · {course.lessonCount} bài học
          {course.ratingAvg !== null && ` · ★ ${course.ratingAvg.toFixed(1)} (${course.ratingCount})`}
        </p>
        <div className="mt-auto pt-2">
          <Price price={course.price} salePrice={course.salePrice} />
        </div>
      </div>
    </Link>
  );
}

export function CourseGrid({ courses }: { courses: CourseSummaryDto[] }) {
  if (courses.length === 0) {
    return <p className="py-12 text-center text-slate-500">Chưa có khóa học nào phù hợp.</p>;
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} />
      ))}
    </div>
  );
}
