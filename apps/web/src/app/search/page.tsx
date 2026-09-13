'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — a page reading search params is
// dynamic, and that pipeline needs every dynamic route on the Edge runtime
// or its build fails outright.
export const runtime = 'edge';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/Skeleton';
import { categoryIcon } from '@/components/Icon';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  categoryId: string;
  brand: ProductBrand;
  tiers: Tier[];
};
type Category = { id: string; slug: string };

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [results, setResults] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
  }, []);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    setResults(null);
    api.get<{ products: Product[] }>(`/products/search?q=${encodeURIComponent(q)}`).then((res) => setResults(res.products));
  }, [q]);

  return (
    <div>
      <h1 className="text-xl font-medium text-stone-900 mb-4">
        {q ? (
          <>
            Results for <span className="text-accent">&ldquo;{q}&rdquo;</span>
          </>
        ) : (
          'Search'
        )}
      </h1>

      {results && results.length === 0 && <p className="text-stone-500">No products matched.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {!results &&
          Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        {results?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            price={priceForQuantity(product.tiers, 1, product.basePrice)}
            tiers={product.tiers}
            categoryIconName={categoryIcon(categories.find((c) => c.id === product.categoryId)?.slug ?? '')}
            brandLabel={BRAND_LABELS[product.brand]}
          />
        ))}
      </div>
    </div>
  );
}
