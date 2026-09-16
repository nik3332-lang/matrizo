"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { useAuth } from "./auth";

type CartItem = {
  id: string;
  product: { id: string; name: string; unit: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
type Cart = { items: CartItem[]; subtotal: number };
type CartState = Cart & {
  itemCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  clear: () => void;
  quantityOf: (productId: string) => number;
  addItem: (productId: string) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
};
const empty: Cart = { items: [], subtotal: 0 };
const CartContext = createContext<CartState | null>(null);

// The catalog, header, basket, and checkout share one customer-scoped cart.
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<{
    ownerId?: string;
    cart: Cart;
    error: string | null;
  }>({ cart: empty, error: null });
  const cart = state.ownerId === userId ? state.cart : empty;
  const error = state.ownerId === userId ? state.error : null;
  const reload = useCallback(() => {
    if (!userId) return Promise.resolve();
    return api
      .get<Cart>("/cart")
      .then((cart) => {
        setState({ ownerId: userId, cart, error: null });
      })
      .catch(() => {
        setState({
          ownerId: userId,
          cart: empty,
          error: "Your basket couldn’t load. Please try again.",
        });
      });
  }, [userId]);
  useEffect(() => {
    if (!authLoading) void reload();
  }, [authLoading, reload]);
  const loading = authLoading || Boolean(userId && state.ownerId !== userId);
  function quantityOf(productId: string) {
    return (
      cart.items.find((item) => item.product.id === productId)?.quantity ?? 0
    );
  }
  async function addItem(productId: string) {
    const existing = quantityOf(productId);
    const updated =
      existing > 0
        ? await api.patch<Cart>(`/cart/items/${productId}`, {
            quantity: existing + 1,
          })
        : await api.post<Cart>("/cart/items", { productId, quantity: 1 });
    setState({ ownerId: userId, cart: updated, error: null });
  }
  async function setQuantity(productId: string, quantity: number) {
    setState({
      ownerId: userId,
      cart: await api.patch<Cart>(`/cart/items/${productId}`, { quantity }),
      error: null,
    });
  }
  function clear() {
    setState({ ownerId: userId, cart: empty, error: null });
  }
  return (
    <CartContext.Provider
      value={{
        ...cart,
        loading,
        error,
        reload,
        clear,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        quantityOf,
        addItem,
        setQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
