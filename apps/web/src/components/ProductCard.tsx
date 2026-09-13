'use client';

import Link from 'next/link';

import { Icon, type IconName } from './Icon';

type Tier = { minQty: number; pricePerUnit: number };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  unit: string;
};

// The shared product tile — home, category, brand, and search each used to
// reimplement this independently (four copies of the same card drifting
// slightly apart). One component now, built on the STAGE 2 tokens: white
// surface, hairline border, one card radius, one accent color reserved for
// the price/bulk-tier line, two font weights, quiet hover (no lift/shadow).
export function ProductCard({
  product,
  price,
  tiers = [],
  categoryIconName,
}: {
  product: ProductCardData;
  price: number;
  tiers?: Tier[];
  categoryIconName: IconName;
}) {
  const bestTier = [...tiers].sort((a, b) => b.minQty - a.minQty)[0];

  return (
    <Link
      href={`/product/${product.slug}`}
      className="block rounded-card border border-line bg-surface overflow-hidden transition-colors hover:border-stone-300"
    >
      {/* Stand-in for product photography until real images are wired in
         (STAGE 4/5) — deliberately neutral: color belongs to the photo
         that replaces this block, not to the placeholder. */}
      <div className="h-28 bg-stone-100 flex items-center justify-center">
        <Icon name={categoryIconName} className="h-7 w-7 text-stone-400" />
      </div>
      <div className="p-4">
        <div className="font-medium text-stone-900 line-clamp-2">{product.name}</div>
        <div className="mt-1 text-sm text-stone-500">per {product.unit}</div>
        <div className="mt-2 font-medium text-accent">₹{price}</div>
        {bestTier && (
          <div className="mt-1 text-xs text-stone-500">
            <span className="font-medium text-accent">₹{bestTier.pricePerUnit}</span> for {bestTier.minQty}+
          </div>
        )}
      </div>
    </Link>
  );
}
