'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — a page reading search params is
// dynamic, and that pipeline needs every dynamic route on the Edge runtime
// or its build fails outright.
export const runtime = 'edge';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };
const BRAND_CHIP: Record<ProductBrand, string> = {
  raksha: 'bg-brand-purple-100 text-brand-purple-800',
  prince: 'bg-brand-orange-100 text-brand-orange-800',
  others: 'bg-stone-200 text-stone-700',
};

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  brand: ProductBrand;
  tiers: Tier[];
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [results, setResults] = useState<Product[] | null>(null);

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
      <h1 className="text-xl font-bold text-stone-900 mb-4">
        {q ? (
          <>
            Results for <span className="text-brand-orange-700">&ldquo;{q}&rdquo;</span>
          </>
        ) : (
          'Search'
        )}
      </h1>

      {!results && <p className="text-stone-500">Searching…</p>}
      {results && results.length === 0 && <p className="text-stone-500">No products matched.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {results?.map((product) => {
          const price = priceForQuantity(product.tiers, 1, product.basePrice);
          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="glass rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              <div className="font-medium text-stone-900">{product.name}</div>
              <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${BRAND_CHIP[product.brand]}`}>
                {BRAND_LABELS[product.brand]}
              </span>
              <div className="text-sm text-stone-500 mt-1">per {product.unit}</div>
              <div className="mt-2 font-bold text-brand-orange-700">₹{price}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
