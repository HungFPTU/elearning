import { Suspense } from 'react';
import { CategoryView } from '@/components/catalog/category-view';

async function Content({ params }: { params: PageProps<'/categories/[slug]/[subjectSlug]'>['params'] }) {
  const { slug, subjectSlug } = await params;
  return <CategoryView slug={slug} subjectSlug={subjectSlug} />;
}

export default function SubjectPage({ params }: PageProps<'/categories/[slug]/[subjectSlug]'>) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<p className="text-slate-500">Đang tải...</p>}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
