'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — every dynamic route must opt
// into the Edge runtime or that pipeline's build fails outright.
export const runtime = 'edge';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';

import { api } from '@/lib/api';

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  imageUrl: string | null;
  tiers: Tier[];
};
type Category = { id: string; slug: string; name: string; icon: string | null };

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<{ category: Category; products: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .get<{ category: Category; products: Product[] }>(`/categories/${slug}/products`)
      .then(setData)
      .catch(() => setError('Category not found.'));
  }, [slug]);

  if (error) return <p className="text-neutral-500">{error}</p>;
  if (!data) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">
        {data.category.icon} {data.category.name}
      </h1>
      {data.products.length === 0 && <p className="text-neutral-500 mt-4">No products in this category yet.</p>}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {data.products.map((product) => {
          const bestTier = [...product.tiers].sort((a, b) => b.minQty - a.minQty)[0];
          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400 transition-colors"
            >
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-neutral-500">per {product.unit}</div>
              <div className="mt-2 font-semibold">₹{product.basePrice}</div>
              {bestTier && (
                <div className="text-xs text-emerald-600">
                  ₹{bestTier.pricePerUnit} for {bestTier.minQty}+
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
