'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — every dynamic route must opt
// into the Edge runtime or that pipeline's build fails outright.
export const runtime = 'edge';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import { ApiError, priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };
const BRAND_CHIP: Record<ProductBrand, string> = {
  raksha: 'bg-brand-purple-100 text-brand-purple-800',
  prince: 'bg-brand-orange-100 text-brand-orange-800',
  others: 'bg-stone-200 text-stone-700',
};

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  basePrice: number;
  brand: ProductBrand;
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

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-stone-900">{product.name}</h1>
      <span className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium ${BRAND_CHIP[product.brand]}`}>
        {BRAND_LABELS[product.brand]}
      </span>
      {product.description && <p className="mt-2 text-stone-600">{product.description}</p>}

      {product.tiers.length > 0 && (
        <div className="glass mt-4 rounded-xl divide-y divide-stone-200/70 text-sm overflow-hidden">
          <div className="px-3 py-2 flex justify-between font-semibold text-stone-700 bg-brand-orange-50/60">
            <span>Quantity</span>
            <span>Price / {product.unit}</span>
          </div>
          <div className="px-3 py-2 flex justify-between">
            <span>1 – {product.tiers[0].minQty - 1}</span>
            <span>₹{product.basePrice}</span>
          </div>
          {[...product.tiers]
            .sort((a, b) => a.minQty - b.minQty)
            .map((tier, i, arr) => (
              <div key={tier.minQty} className="px-3 py-2 flex justify-between">
                <span>
                  {tier.minQty}
                  {arr[i + 1] ? ` – ${arr[i + 1].minQty - 1}` : '+'}
                </span>
                <span className="font-medium text-emerald-700">₹{tier.pricePerUnit}</span>
              </div>
            ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <label className="text-sm font-medium text-stone-700">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-20 rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
        />
        <div className="font-bold text-brand-orange-700">₹{unitPrice * quantity} total</div>
      </div>

      <button
        onClick={addToCart}
        disabled={adding}
        className="mt-4 rounded-lg bg-gradient-to-r from-brand-orange-600 to-brand-purple-600 text-white px-5 py-2.5 font-semibold shadow-sm hover:from-brand-orange-700 hover:to-brand-purple-700 disabled:opacity-60"
      >
        {adding ? 'Adding…' : added ? 'Added ✓' : 'Add to cart'}
      </button>
    </div>
  );
}
