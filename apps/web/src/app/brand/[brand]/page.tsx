'use client';

// `runtime = 'edge'` used to be set here for the old Pages/next-on-pages
// deploy path, on the assumption it was merely unneeded (not harmful) on
// the Workers matrizo-web deploy. Confirmed live that assumption was
// wrong: it 500s this route in production via the exact OpenNext/
// Cloudflare Workers bug documented in components/Icon.tsx's comment
// ("Cannot read properties of undefined (reading 'default')") — removed.
// If the old next-on-pages pipeline ever gets rebuilt from this source
// again, it may need this back; it's being retired in favor of Workers
// per the migration note in wrangler.jsonc, so that's accepted here.

import { use, useEffect, useState } from 'react';

import { PRODUCT_BRANDS, priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/Skeleton';
import { categoryIcon } from '@/components/Icon';
import { productCatalogImage } from '@/lib/catalogImages';
import type { ProductSpecs } from '@/lib/specs';

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  imageUrl: string | null;
  categoryId: string;
  brand: ProductBrand;
  tiers: Tier[];
  specs: ProductSpecs | null;
  gstInvoiceEligible: boolean;
};
type BrandInfo = { brand: ProductBrand; name: string };
type Category = { id: string; slug: string };

export default function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: brandParam } = use(params);
  const [data, setData] = useState<{ brand: BrandInfo; products: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
  }, []);

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
  if (!data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-medium text-stone-900 mb-1">{data.brand.name}</h1>
      <p className="text-sm text-stone-500">All products from {data.brand.name}.</p>

      {data.products.length === 0 && <p className="text-stone-500 mt-4">No products from this brand yet.</p>}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {data.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            price={priceForQuantity(product.tiers, 1, product.basePrice)}
            tiers={product.tiers}
            categoryIconName={categoryIcon(categories.find((c) => c.id === product.categoryId)?.slug ?? '')}
            imageSrc={productCatalogImage(categories.find((c) => c.id === product.categoryId)?.slug ?? '', product.name)}
            specs={product.specs}
            gstInvoiceEligible={product.gstInvoiceEligible}
          />
        ))}
      </div>
    </div>
  );
}
