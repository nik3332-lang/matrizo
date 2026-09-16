'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';
import { categoryCatalogImage, productCatalogImage } from '@/lib/catalogImages';
import { categoryIcon, Icon } from '@/components/Icon';
import { HeroBanner } from '@/components/HeroBanner';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton, TileSkeleton } from '@/components/Skeleton';
import type { ProductSpecs } from '@/lib/specs';

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

type Brand = { brand: ProductBrand; name: string; productCount: number };

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  categoryId: string;
  tiers: Tier[];
  specs: ProductSpecs | null;
  gstInvoiceEligible: boolean;
};

const STEPS = [
  { step: '1', title: 'Check your pincode', body: 'See if we deliver to your address in seconds.' },
  { step: '2', title: 'Browse & order', body: 'Pick what you need — bulk pricing applies automatically.' },
  { step: '3', title: 'Get it delivered', body: 'Track your order live, right up to your door.' },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [popular, setPopular] = useState<Product[] | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then(async (res) => {
      setCategories(res.categories);

      const perCategory = await Promise.all(
        res.categories.map((cat) =>
          api
            .get<{ products: Product[] }>(`/categories/${cat.slug}/products`)
            .then((r) => r.products)
            .catch(() => [])
        )
      );
      setPopular(perCategory.flat().slice(0, 8));
    });
    api.get<{ brands: Brand[] }>('/brands').then((res) => setBrands(res.brands));
  }, []);

  return (
    <div className="space-y-10">
      {categories && categories.length > 0 && (
        <section>
          <HeroBanner availableSlugs={categories.map((c) => c.slug)} />
        </section>
      )}

      {/* Catalog first — category grid, then brand row, then frequently-
         ordered products. The old pincode-check hero and four benefit
         tiles are gone: ETA now lives in the persistent header location
         bar, bulk tiers are on each product card, COD is on the checkout
         button, and warranty/authenticity moved to the product page. */}
      <section>
        <h2 className="text-lg font-medium text-stone-900 mb-4">Shop by category</h2>
        {!categories && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <TileSkeleton key={i} />
            ))}
          </div>
        )}
        {categories && categories.length === 0 && <p className="text-stone-500">No categories yet.</p>}
        {categories && categories.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="glass rounded-card p-2 text-center transition-colors hover:border-stone-300"
              >
                <div className="relative mx-auto h-16 sm:h-20 w-full">
                  {categoryCatalogImage(cat.slug) ? (
                    <Image
                      src={categoryCatalogImage(cat.slug)!}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="mx-auto h-14 w-14 rounded-full bg-accent-subtle flex items-center justify-center">
                      <Icon name={categoryIcon(cat.slug)} className="h-7 w-7 text-accent" />
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs sm:text-sm font-medium text-stone-900 line-clamp-2">{cat.name}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900 mb-4">Shop by brand</h2>
        {!brands && (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <TileSkeleton key={i} />
            ))}
          </div>
        )}
        {brands && (
          <div className="grid grid-cols-3 gap-4">
            {brands
              .filter((b) => b.productCount > 0)
              .map((b) => (
                <Link
                  key={b.brand}
                  href={`/brand/${b.brand}`}
                  className="glass rounded-card p-5 text-center transition-colors hover:border-stone-300"
                >
                  <div className="mx-auto h-12 w-12 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-medium">
                    {b.name[0]}
                  </div>
                  <div className="mt-3 font-medium text-stone-900">{b.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{b.productCount} products</div>
                </Link>
              ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900 mb-4">Frequently ordered</h2>
        {!popular && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}
        {popular && popular.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {popular.map((product) => {
              const price = priceForQuantity(product.tiers, 1, product.basePrice);
              const cat = categories?.find((c) => c.id === product.categoryId);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  price={price}
                  tiers={product.tiers}
                  categoryIconName={categoryIcon(cat?.slug ?? '')}
                  imageSrc={productCatalogImage(cat?.slug ?? '', product.name)}
                  specs={product.specs}
                  gstInvoiceEligible={product.gstInvoiceEligible}
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900 mb-4">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.step} className="glass rounded-card p-5">
              <div className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center font-medium text-sm">
                {s.step}
              </div>
              <div className="mt-3 font-medium text-stone-900">{s.title}</div>
              <div className="mt-1 text-sm text-stone-500">{s.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
