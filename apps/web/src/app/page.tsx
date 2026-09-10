'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';
import { categoryColor } from '@/lib/categoryColors';
import { categoryIcon, Icon } from '@/components/Icon';
import { ProductSwatch } from '@/components/ProductSwatch';

const BRAND_ACCENT: Record<ProductBrand, string> = {
  raksha: 'from-brand-purple-500 to-brand-purple-800',
  prince: 'from-brand-orange-500 to-brand-orange-700',
  others: 'from-stone-400 to-stone-600',
};

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
};

type Serviceability = {
  pincode: string;
  serviceable: boolean;
  etaMinutes: number | null;
};

const FEATURES = [
  { icon: 'truck', title: 'Fast delivery', body: 'Straight from your nearest dark store, usually under an hour.' },
  { icon: 'badgeCheck', title: 'Genuine products', body: 'Trusted brands, real specs — no substitutes.' },
  { icon: 'package', title: 'Bulk pricing', body: 'Order more, pay less — tiered pricing built in.' },
  { icon: 'cash', title: 'Pay on delivery', body: 'Cash on delivery, no payment details needed upfront.' },
] as const;

const STEPS = [
  { step: '1', title: 'Check your pincode', body: 'See if we deliver to your address in seconds.' },
  { step: '2', title: 'Browse & order', body: 'Pick what you need — bulk pricing applies automatically.' },
  { step: '3', title: 'Get it delivered', body: 'Track your order live, right up to your door.' },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [popular, setPopular] = useState<Product[] | null>(null);
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Serviceability | null>(null);

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

  async function checkPincode(e: React.FormEvent) {
    e.preventDefault();
    if (!pincode.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await api.get<Serviceability>(`/serviceability/${encodeURIComponent(pincode.trim())}`);
      setResult(res);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-orange-700 via-brand-orange-600 to-brand-purple-600 text-white p-8 shadow-lg shadow-brand-orange-900/20">
        <Icon name="mapPin" className="pointer-events-none absolute -right-6 -bottom-8 h-40 w-40 text-white/10" />
        <h1 className="relative text-2xl font-bold">Sanitary & paints — delivered fast.</h1>
        <p className="relative mt-2 text-brand-orange-50">Check if we deliver to your pincode.</p>
        <form onSubmit={checkPincode} className="relative mt-4 flex gap-2 max-w-sm">
          <div className="relative flex-1">
            <Icon name="mapPin" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Enter pincode"
              className="w-full rounded-lg pl-9 pr-3 py-2 text-stone-900 outline-none focus:ring-2 focus:ring-white"
              inputMode="numeric"
            />
          </div>
          <button
            type="submit"
            disabled={checking}
            className="rounded-lg bg-white text-brand-orange-700 px-4 py-2 font-semibold shadow-sm disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check'}
          </button>
        </form>
        {result && (
          <p className="relative mt-3 text-sm">
            {result.serviceable ? (
              <span className="text-emerald-100 font-medium">✓ We deliver here — ETA ~{result.etaMinutes} min.</span>
            ) : (
              <span className="text-brand-orange-100 font-medium">Not serviceable at this pincode yet.</span>
            )}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass rounded-xl p-4 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-brand-orange-50 flex items-center justify-center">
              <Icon name={f.icon} className="h-5 w-5 text-brand-orange-700" />
            </div>
            <div className="mt-2 font-semibold text-stone-900 text-sm">{f.title}</div>
            <div className="mt-1 text-xs text-stone-500">{f.body}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Shop by category</h2>
        {!categories && <p className="text-stone-500">Loading…</p>}
        {categories && categories.length === 0 && <p className="text-stone-500">No categories yet.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories?.map((cat) => {
            const color = categoryColor(cat.id);
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="glass rounded-xl p-5 text-center hover:-translate-y-0.5 hover:shadow-lg transition-all"
              >
                <div
                  className={`mx-auto h-14 w-14 rounded-full bg-gradient-to-br ${color.accent} flex items-center justify-center shadow-md`}
                >
                  <Icon name={categoryIcon(cat.slug)} className="h-7 w-7 text-white" />
                </div>
                <div className="mt-3 font-semibold text-stone-900">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Shop by brand</h2>
        {!brands && <p className="text-stone-500">Loading…</p>}
        <div className="grid grid-cols-3 gap-4">
          {brands
            ?.filter((b) => b.productCount > 0)
            .map((b) => (
              <Link
                key={b.brand}
                href={`/brand/${b.brand}`}
                className="glass rounded-xl p-5 text-center hover:-translate-y-0.5 hover:shadow-lg transition-all"
              >
                <div
                  className={`mx-auto h-12 w-12 rounded-full bg-gradient-to-br ${BRAND_ACCENT[b.brand]} flex items-center justify-center text-white font-bold shadow-md`}
                >
                  {b.name[0]}
                </div>
                <div className="mt-3 font-semibold text-stone-900">{b.name}</div>
                <div className="text-xs text-stone-500 mt-0.5">{b.productCount} products</div>
              </Link>
            ))}
        </div>
      </section>

      {popular && popular.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Popular right now</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {popular.map((product) => {
              const price = priceForQuantity(product.tiers, 1, product.basePrice);
              const cat = categories?.find((c) => c.id === product.categoryId);
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="glass rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all overflow-hidden"
                >
                  <ProductSwatch accent={categoryColor(product.categoryId).accent} categorySlug={cat?.slug} />
                  <div className="font-medium text-sm text-stone-900 line-clamp-2">{product.name}</div>
                  <div className="text-xs text-stone-500 mt-1">per {product.unit}</div>
                  <div className="mt-2 font-bold text-brand-orange-700">₹{price}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.step} className="glass rounded-xl p-5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-orange-500 to-brand-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {s.step}
              </div>
              <div className="mt-3 font-semibold text-stone-900">{s.title}</div>
              <div className="mt-1 text-sm text-stone-500">{s.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
