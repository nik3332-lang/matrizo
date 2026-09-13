'use client';

import { useState } from 'react';

import { priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { ProductCard } from '@/components/ProductCard';
import { categoryIcon } from '@/components/Icon';
import type { ProductSpecs } from '@/lib/specs';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };

type Tier = { minQty: number; pricePerUnit: number };
export type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  brand: ProductBrand;
  tiers: Tier[];
  specs: ProductSpecs | null;
  gstInvoiceEligible: boolean;
};

// The one client-side piece of an otherwise server-rendered category page
// (STAGE 6) — brand filtering is pure array filtering over data the server
// already fetched, so no loading state is needed here at all.
//
// Layout: filter chips above the grid under 768px (no room for a sidebar
// on a phone), a left filter rail beside a multi-column grid at sm+ (STAGE
// 6). Brand is the only filterable attribute today — there's no
// finish/surface/material data yet (see project notes) — but the rail
// structure is here for when there is.
export function BrandFilterGrid({
  products,
  brandsPresent,
  categorySlug,
}: {
  products: Product[];
  brandsPresent: ProductBrand[];
  categorySlug: string;
}) {
  const [brandFilter, setBrandFilter] = useState<ProductBrand | 'all'>('all');
  const visibleProducts = brandFilter === 'all' ? products : products.filter((p) => p.brand === brandFilter);

  const options: { value: ProductBrand | 'all'; label: string }[] = [
    { value: 'all', label: 'All brands' },
    ...brandsPresent.map((b) => ({ value: b, label: BRAND_LABELS[b] })),
  ];

  return (
    <div className="sm:flex sm:items-start sm:gap-6">
      {brandsPresent.length > 1 && (
        <>
          {/* Mobile: horizontal chips above the grid. */}
          <div className="sm:hidden mb-6 flex gap-2 flex-wrap">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBrandFilter(opt.value)}
                className={`min-h-11 text-xs px-3 rounded-card font-medium ring-1 transition-colors ${
                  brandFilter === opt.value ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-600 ring-line hover:ring-stone-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Desktop: left filter rail beside the grid. */}
          <aside className="hidden sm:block w-44 shrink-0">
            <div className="text-xs font-medium text-stone-500 mb-2">Brand</div>
            <div className="space-y-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBrandFilter(opt.value)}
                  className={`w-full text-left min-h-11 px-3 rounded-card text-sm font-medium transition-colors ${
                    brandFilter === opt.value ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </aside>
        </>
      )}

      <div className="flex-1 min-w-0">
        {products.length === 0 && <p className="text-stone-500">No products in this category yet.</p>}
        {products.length > 0 && visibleProducts.length === 0 && (
          <p className="text-stone-500">No {BRAND_LABELS[brandFilter as ProductBrand]} products in this category.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              price={priceForQuantity(product.tiers, 1, product.basePrice)}
              tiers={product.tiers}
              categoryIconName={categoryIcon(categorySlug)}
              brandLabel={BRAND_LABELS[product.brand]}
              specs={product.specs}
              gstInvoiceEligible={product.gstInvoiceEligible}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
