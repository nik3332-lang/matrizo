'use client';

import { categoryIcon, Icon } from './Icon';

// A colored header block standing in for a product photo (none of the
// catalog has real images yet). Without this, every product card is bare
// text on white and reads as an empty skeleton — this gives each card a
// visual anchor and makes categories distinguishable at a glance in a grid
// of otherwise-identical fitting names.
export function ProductSwatch({ accent, categorySlug }: { accent: string; categorySlug?: string }) {
  return (
    <div className={`h-16 -m-4 mb-3 rounded-t-xl bg-gradient-to-br ${accent} flex items-center justify-center`}>
      <Icon name={categoryIcon(categorySlug ?? '')} className="h-7 w-7 text-white/90" />
    </div>
  );
}
