// Server component (STAGE 6) — same reasoning as the product page: a
// category link shared cold needs real content and real metadata on
// first paint, not a client fetch behind a skeleton.
export const runtime = 'edge';

import type { Metadata } from 'next';

import { PRODUCT_BRANDS } from '@matrizo/shared';
import { api } from '@/lib/api';
import { categoryIcon } from '@/lib/categoryIcon';
import { Icon } from '@/components/Icon';
import { BrandFilterGrid, type Product } from './BrandFilterGrid';

type Category = { id: string; slug: string; name: string; icon: string | null };

async function getCategory(slug: string): Promise<{ category: Category; products: Product[] } | null> {
  try {
    return await api.get<{ category: Category; products: Product[] }>(`/categories/${slug}/products`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategory(slug);
  if (!data) return { title: 'Category not found — Matrizo' };
  return {
    title: `${data.category.name} — Matrizo`,
    description: `Shop ${data.category.name} — delivered fast from your nearest Matrizo dark store.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCategory(slug);

  if (!data) return <p className="text-stone-500">Category not found.</p>;

  const brandsPresent = PRODUCT_BRANDS.filter((b) => data.products.some((p) => p.brand === b));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
          <Icon name={categoryIcon(slug)} className="h-5 w-5 text-stone-500" />
        </div>
        <h1 className="text-xl font-medium text-stone-900">{data.category.name}</h1>
      </div>

      <BrandFilterGrid products={data.products} brandsPresent={brandsPresent} categorySlug={slug} />
    </div>
  );
}
