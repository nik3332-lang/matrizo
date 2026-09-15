'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { api } from './api';
import { useAuth } from './auth';

type CartItem = {
  id: string;
  product: { id: string; name: string; unit: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
type Cart = { items: CartItem[]; subtotal: number };

type CartState = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  quantityOf: (productId: string) => number;
  addItem: (productId: string) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
};

const CartContext = createContext<CartState | null>(null);

// Mirrors lib/location.tsx's provider pattern: one app-wide source of truth
// so the nav badge, the floating cart bar, and every ProductCard's quick-add
// control all reflect the same state instead of each fetching /cart on its
// own. Cart still requires login (see apps/api/src/routes/cart.ts) — there's
// no anonymous/KV-backed cart yet, so signed-out state is just an empty cart.
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart({ items: [], subtotal: 0 });
      return;
    }
    api.get<Cart>('/cart').then(setCart);
  }, [authLoading, user]);

  function quantityOf(productId: string) {
    return cart.items.find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  async function addItem(productId: string) {
    const existing = quantityOf(productId);
    if (existing > 0) {
      setCart(await api.patch<Cart>(`/cart/items/${productId}`, { quantity: existing + 1 }));
    } else {
      setCart(await api.post<Cart>('/cart/items', { productId, quantity: 1 }));
    }
  }

  async function setQuantity(productId: string, quantity: number) {
    setCart(await api.patch<Cart>(`/cart/items/${productId}`, { quantity }));
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items: cart.items, subtotal: cart.subtotal, itemCount, quantityOf, addItem, setQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
