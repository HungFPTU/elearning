import { Suspense } from 'react';
import { CategoryView } from '@/components/catalog/category-view';

async function Content({ params }: { params: PageProps<'/categories/[slug]'>['params'] }) {
  const { slug } = await params;
  return <CategoryView slug={slug} />;
}

export default function CategoryPage({ params }: PageProps<'/categories/[slug]'>) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<p className="text-slate-500">Đang tải...</p>}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
