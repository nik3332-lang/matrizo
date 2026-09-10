'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — every dynamic route must opt
// into the Edge runtime or that pipeline's build fails outright.
export const runtime = 'edge';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';

import { PRODUCT_BRANDS, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';
import { categoryIcon, Icon } from '@/components/Icon';
import { ProductSwatch } from '@/components/ProductSwatch';
import { categoryColor } from '@/lib/categoryColors';

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
  imageUrl: string | null;
  brand: ProductBrand;
  tiers: Tier[];
};
type Category = { id: string; slug: string; name: string; icon: string | null };

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<{ category: Category; products: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<ProductBrand | 'all'>('all');

  useEffect(() => {
    setData(null);
    setError(null);
    setBrandFilter('all');
    api
      .get<{ category: Category; products: Product[] }>(`/categories/${slug}/products`)
      .then(setData)
      .catch(() => setError('Category not found.'));
  }, [slug]);

  if (error) return <p className="text-stone-500">{error}</p>;
  if (!data) return <p className="text-stone-500">Loading…</p>;

  const brandsPresent = PRODUCT_BRANDS.filter((b) => data.products.some((p) => p.brand === b));
  const visibleProducts = brandFilter === 'all' ? data.products : data.products.filter((p) => p.brand === brandFilter);

  const accent = categoryColor(data.category.id).accent;

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className={`h-10 w-10 rounded-full ${accent} flex items-center justify-center shrink-0`}>
          <Icon name={categoryIcon(slug)} className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-stone-900">{data.category.name}</h1>
      </div>

      {brandsPresent.length > 1 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setBrandFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ring-1 transition-colors ${
              brandFilter === 'all'
                ? 'bg-stone-900 text-white ring-stone-900'
                : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'
            }`}
          >
            All brands
          </button>
          {brandsPresent.map((b) => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ring-1 transition-colors ${
                brandFilter === b ? BRAND_CHIP[b] + ' ring-2' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'
              }`}
            >
              {BRAND_LABELS[b]}
            </button>
          ))}
        </div>
      )}

      {data.products.length === 0 && <p className="text-stone-500 mt-4">No products in this category yet.</p>}
      {data.products.length > 0 && visibleProducts.length === 0 && (
        <p className="text-stone-500 mt-4">No {BRAND_LABELS[brandFilter as ProductBrand]} products in this category.</p>
      )}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {visibleProducts.map((product) => {
          const bestTier = [...product.tiers].sort((a, b) => b.minQty - a.minQty)[0];
          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="glass rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all overflow-hidden"
            >
              <ProductSwatch accent={accent} categorySlug={slug} />
              <div className="font-semibold text-stone-900">{product.name}</div>
              <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${BRAND_CHIP[product.brand]}`}>
                {BRAND_LABELS[product.brand]}
              </span>
              <div className="text-sm text-stone-500 mt-1">per {product.unit}</div>
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
