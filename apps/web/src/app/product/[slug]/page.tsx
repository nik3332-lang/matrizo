'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — every dynamic route must opt
// into the Edge runtime or that pipeline's build fails outright.
export const runtime = 'edge';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import { ApiError, priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { categoryIcon, Icon } from '@/components/Icon';
import { categoryColor } from '@/lib/categoryColors';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };
const BRAND_CHIP: Record<ProductBrand, string> = {
  raksha: 'bg-brand-purple-100 text-brand-purple-800',
  prince: 'bg-brand-orange-100 text-brand-orange-800',
  others: 'bg-stone-200 text-stone-700',
};

type Tier = { minQty: number; pricePerUnit: number };
type Category = { id: string; slug: string; name: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  basePrice: number;
  categoryId: string;
  brand: ProductBrand;
  category: Category | null;
  tiers: Tier[];
};

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, loading } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api
      .get<{ product: Product }>(`/products/${slug}`)
      .then((res) => setProduct(res.product))
      .catch(() => setError('Product not found.'));
  }, [slug]);

  async function addToCart() {
    if (!product) return;
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    setAdding(true);
    setAdded(false);
    try {
      await api.post('/cart/items', { productId: product.id, quantity });
      setAdded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add to cart.');
    } finally {
      setAdding(false);
    }
  }

  if (error) return <p className="text-stone-500">{error}</p>;
  if (!product) return <p className="text-stone-500">Loading…</p>;

  const unitPrice = priceForQuantity(product.tiers, quantity, product.basePrice);
  const accent = categoryColor(product.categoryId).accent;

  return (
    <div className="max-w-3xl">
      <nav className="flex items-center gap-1.5 text-sm text-stone-500 mb-4">
        <Link href="/" className="hover:text-brand-orange-700">
          Home
        </Link>
        {product.category && (
          <>
            <Icon name="chevronLeft" className="h-3 w-3 rotate-180" />
            <Link href={`/category/${product.category.slug}`} className="hover:text-brand-orange-700">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid sm:grid-cols-[220px_1fr] gap-6">
        <div className={`h-44 sm:h-full rounded-2xl ${accent} flex items-center justify-center shrink-0`}>
          <Icon name={categoryIcon(product.category?.slug ?? '')} className="h-16 w-16 text-white/90" />
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-stone-900">{product.name}</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${BRAND_CHIP[product.brand]}`}>
              {BRAND_LABELS[product.brand]}
            </span>
            <span className="text-xs text-stone-400">SKU {product.sku}</span>
          </div>
          {product.description && <p className="mt-3 text-stone-600">{product.description}</p>}

          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-orange-700">₹{unitPrice}</span>
            <span className="text-sm text-stone-500">/ {product.unit}</span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <label className="text-sm font-medium text-stone-700">Quantity</label>
            <div className="flex items-center rounded-lg border border-stone-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-stone-600 hover:bg-stone-100"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-14 text-center py-2 outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-stone-600 hover:bg-stone-100"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <div className="font-bold text-stone-900">₹{unitPrice * quantity} total</div>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <button
            onClick={addToCart}
            disabled={adding}
            className="mt-5 rounded-lg bg-brand-orange-700 text-white px-5 py-2.5 font-semibold shadow-sm hover:bg-brand-orange-800 disabled:opacity-60"
          >
            {adding ? 'Adding…' : added ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>

      {product.tiers.length > 0 && (
        <div className="glass mt-8 rounded-xl divide-y divide-stone-200/70 text-sm overflow-hidden max-w-md">
          <div className="px-4 py-2.5 flex justify-between font-semibold text-stone-700 bg-brand-orange-50/60">
            <span>Quantity</span>
            <span>Price / {product.unit}</span>
          </div>
          <div className="px-4 py-2.5 flex justify-between">
            <span>1 – {product.tiers[0].minQty - 1}</span>
            <span>₹{product.basePrice}</span>
          </div>
          {[...product.tiers]
            .sort((a, b) => a.minQty - b.minQty)
            .map((tier, i, arr) => (
              <div key={tier.minQty} className="px-4 py-2.5 flex justify-between">
                <span>
                  {tier.minQty}
                  {arr[i + 1] ? ` – ${arr[i + 1].minQty - 1}` : '+'}
                </span>
                <span className="font-medium text-emerald-700">₹{tier.pricePerUnit}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
