import type { CategoryTreeDto } from '@elearning/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourseGrid } from '@/components/course/course-card';
import { buttonClasses } from '@/components/ui/button';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/utils';

export async function loadCategory(slug: string): Promise<CategoryTreeDto> {
  try {
    return await api.getCategory(slug);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound();
    throw err;
  }
}

/** Category header, subject chips and the matching courses. `subjectSlug` narrows to one subject. */
export async function CategoryView({ slug, subjectSlug }: { slug: string; subjectSlug?: string }) {
  const category = await loadCategory(slug);
  const subject = subjectSlug ? category.subjects.find((s) => s.slug === subjectSlug) : undefined;
  if (subjectSlug && !subject) notFound();
  const courses = await api.listCourses({ category: slug, subject: subjectSlug, pageSize: '24' });

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/courses" className="hover:text-indigo-600">
          Khóa học
        </Link>
        {' / '}
        {subject ? (
          <Link href={`/categories/${category.slug}`} className="hover:text-indigo-600">
            {category.name}
          </Link>
        ) : (
          category.name
        )}
        {subject && ` / ${subject.name}`}
      </nav>
      <div>
        <h1 className="text-3xl font-bold">{subject?.name ?? category.name}</h1>
        {(subject?.description ?? category.description) && (
          <p className="mt-2 text-slate-600">{subject?.description ?? category.description}</p>
        )}
      </div>
      {category.subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/categories/${category.slug}`} className={buttonClasses(subject ? 'outline' : 'primary', 'h-8')}>
            Tất cả
          </Link>
          {category.subjects.map((s) => (
            <Link
              key={s.id}
              href={`/categories/${category.slug}/${s.slug}`}
              className={cn(buttonClasses(s.slug === subjectSlug ? 'primary' : 'outline', 'h-8'))}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}
      <p className="text-sm text-slate-500">{courses.total} khóa học</p>
      <CourseGrid courses={courses.items} />
    </div>
  );
}
