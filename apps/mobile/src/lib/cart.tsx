import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, session } from "./api";
import { useAuth } from "./auth";
import type { Cart } from "./types";
import { message } from "./useResource";
const empty: Cart = { items: [], subtotal: 0 };
type Value = {
  cart: Cart;
  loading: boolean;
  busy: boolean;
  error: string;
  reload(): Promise<void>;
  change(productId: string, quantity: number): Promise<void>;
  add(productId: string, quantity: number): Promise<void>;
};
const Context = createContext<Value | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(empty),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const mutation = useRef(false),
    generation = useRef(0);
  const reload = useCallback(async () => {
    const version = ++generation.current;
    if (!user) {
      setCart(empty);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.get<Cart>("/cart");
      if (generation.current === version && session.get()?.user.id === user.id)
        setCart(result);
    } catch (e) {
      if (generation.current === version) setError(message(e));
    } finally {
      if (generation.current === version) setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    setCart(empty);
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  async function mutate(productId: string, quantity: number, add: boolean) {
    if (!user) throw new Error("Please sign in first.");
    if (mutation.current)
      throw new Error("Please wait for your cart to update.");
    mutation.current = true;
    setBusy(true);
    setError("");
    generation.current++;
    try {
      const result = add
        ? await api.post<Cart>("/cart/items", { productId, quantity })
        : await api.patch<Cart>(
            `/cart/items/${encodeURIComponent(productId)}`,
            { quantity },
          );
      if (session.get()?.user.id === user.id) {
        // A pull-to-refresh during this write must not overwrite its committed result.
        generation.current++;
        setLoading(false);
        setCart(result);
      }
    } catch (e) {
      if (session.get()?.user.id === user.id) {
        setError(message(e));
        await reload();
      }
      throw e;
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        cart,
        loading,
        busy,
        error,
        reload,
        add: (id, qty) => mutate(id, qty, true),
        change: (id, qty) => mutate(id, qty, false),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing CartProvider");
  return context;
}
