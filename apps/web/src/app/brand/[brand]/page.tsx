'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — every dynamic route must opt
// into the Edge runtime or that pipeline's build fails outright.
export const runtime = 'edge';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';

import { PRODUCT_BRANDS, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  imageUrl: string | null;
  brand: ProductBrand;
  tiers: Tier[];
};
type BrandInfo = { brand: ProductBrand; name: string };

export default function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: brandParam } = use(params);
  const [data, setData] = useState<{ brand: BrandInfo; products: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    if (!PRODUCT_BRANDS.includes(brandParam as ProductBrand)) {
      setError('Unknown brand.');
      return;
    }
    api
      .get<{ brand: BrandInfo; products: Product[] }>(`/brands/${brandParam}/products`)
      .then(setData)
      .catch(() => setError('Brand not found.'));
  }, [brandParam]);

  if (error) return <p className="text-stone-500">{error}</p>;
  if (!data) return <p className="text-stone-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900 mb-1">{data.brand.name}</h1>
      <p className="text-sm text-stone-500">All products from {data.brand.name}.</p>

      {data.products.length === 0 && <p className="text-stone-500 mt-4">No products from this brand yet.</p>}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {data.products.map((product) => {
          const bestTier = [...product.tiers].sort((a, b) => b.minQty - a.minQty)[0];
          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="glass rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              <div className="font-semibold text-stone-900">{product.name}</div>
              <div className="text-sm text-stone-500">per {product.unit}</div>
              <div className="mt-2 font-bold text-brand-orange-700">₹{product.basePrice}</div>
              {bestTier && (
                <div className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
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
