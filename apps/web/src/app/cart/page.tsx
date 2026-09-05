'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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
      <p className="text-neutral-600">
        <Link href="/login" className="underline">
          Log in
        </Link>{' '}
        to view your cart.
      </p>
    );
  }

  if (!cart) return <p className="text-neutral-500">Loading…</p>;

  if (cart.items.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Your cart</h1>
        <p className="text-neutral-500">
          Your cart is empty.{' '}
          <Link href="/" className="underline">
            Browse categories
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Your cart</h1>
      <div className="divide-y border border-neutral-200 rounded-md bg-white">
        {cart.items.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">{item.product.name}</div>
              <div className="text-sm text-neutral-500">
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
                className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-center"
              />
              <div className="w-20 text-right font-medium">₹{item.lineTotal}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-neutral-600">Subtotal</span>
        <span className="text-lg font-semibold">₹{cart.subtotal}</span>
      </div>
      <Link
        href="/checkout"
        className="mt-4 block text-center rounded-md bg-neutral-900 text-white px-5 py-2 font-medium"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}
