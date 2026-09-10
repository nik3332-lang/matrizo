'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Icon } from '@/components/Icon';

type CartItem = {
  id: string;
  product: { id: string; name: string; unit: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
type Cart = { items: CartItem[]; subtotal: number };

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  function reload() {
    api.get<Cart>('/cart').then(setCart);
  }

  useEffect(() => {
    if (!authLoading && user) reload();
  }, [authLoading, user]);

  async function updateQuantity(productId: string, quantity: number) {
    setBusyProductId(productId);
    try {
      const res = await api.patch<Cart>(`/cart/items/${productId}`, { quantity });
      setCart(res);
    } finally {
      setBusyProductId(null);
    }
  }

  if (!authLoading && !user) {
    return (
      <p className="text-stone-600">
        <Link href="/login" className="text-brand-orange-700 font-medium underline">
          Log in
        </Link>{' '}
        to view your cart.
      </p>
    );
  }

  if (!cart) return <p className="text-stone-500">Loading…</p>;

  if (cart.items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-14 w-14 rounded-full bg-brand-orange-50 flex items-center justify-center">
          <Icon name="cart" className="h-7 w-7 text-brand-orange-400" />
        </div>
        <p className="mt-4 text-stone-500">Your cart is empty.</p>
        <Link href="/" className="mt-1 inline-block text-brand-orange-700 font-medium hover:underline">
          Browse categories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-stone-900 mb-4">Your cart</h1>
      <div className="glass divide-y divide-stone-200/70 rounded-xl">
        {cart.items.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-stone-900">{item.product.name}</div>
              <div className="text-sm text-stone-500">
                ₹{item.unitPrice} / {item.product.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={item.quantity}
                disabled={busyProductId === item.product.id}
                onChange={(e) => updateQuantity(item.product.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 rounded-lg border border-stone-300 px-2 py-1 text-center focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
              <div className="w-20 text-right font-semibold text-brand-orange-700">₹{item.lineTotal}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="glass mt-4 rounded-xl p-4 flex items-center justify-between">
        <span className="text-stone-600 font-medium">Subtotal</span>
        <span className="text-lg font-bold text-brand-orange-700">₹{cart.subtotal}</span>
      </div>
      <Link
        href="/checkout"
        className="mt-4 block text-center rounded-lg bg-brand-orange-700 text-white px-5 py-2.5 font-semibold shadow-sm hover:bg-brand-orange-800"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}
