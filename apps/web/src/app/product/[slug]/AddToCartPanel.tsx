"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, priceForQuantity } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocation } from "@/lib/location";
import { useCart } from "@/lib/cart";
import { ShadePicker } from "@/components/ShadePicker";
import type { Shade } from "@matrizo/shared";

type Tier = { minQty: number; pricePerUnit: number };
type Stock = { storeName: string; available: boolean; etaMinutes: number };

// The only interactive part of the product page — quantity + add-to-cart —
// split out so the page itself can be a server component (STAGE 6: real
// SSR for a link that gets opened cold from WhatsApp) while this still
// reads auth state and posts to the cart client-side. Also owns the
// stock/store line (STAGE 4): unlike name/price/description, "is this in
// stock near me" genuinely depends on the customer's location, which the
// server doesn't know on a cold load — it's only knowable client-side,
// from the header location bar (lib/location.tsx).
export function AddToCartPanel({
  productId,
  productSlug,
  unit,
  basePrice,
  tiers,
  colourSelection = false,
}: {
  productId: string;
  productSlug: string;
  unit: string;
  basePrice: number;
  tiers: Tier[];
  colourSelection?: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const [shade, setShade] = useState<Shade | null>(null);
  const { user, loading } = useAuth();
  const { pincode } = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stock, setStock] = useState<Stock | null>(null);
  const [stockChecked, setStockChecked] = useState(false);

  useEffect(() => {
    // Reset before the pincode-keyed re-fetch below so a stale result from
    // the previous pincode never lingers on screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStockChecked(false);
    if (!pincode) {
      setStock(null);
      return;
    }
    let live = true;
    api
      .get<{ stock: Stock | null }>(
        `/products/${productSlug}/stock?pincode=${encodeURIComponent(pincode)}`,
      )
      .then((res) => {
        if (live) setStock(res.stock);
      })
      .catch(() => {
        if (live) setStock(null);
      })
      .finally(() => {
        if (live) setStockChecked(true);
      });
    return () => {
      live = false;
    };
  }, [pincode, productSlug]);

  const unitPrice = priceForQuantity(tiers, quantity, basePrice);
  const total = unitPrice * quantity;

  async function addToCart() {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    setAdding(true);
    setAdded(false);
    setError(null);
    try {
      await api.post("/cart/items", {
        productId,
        quantity,
        shadeId: shade?.id,
      });
      await cart.reload();
      setAdded(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not add to cart.",
      );
    } finally {
      setAdding(false);
    }
  }

  const buttonLabel = adding ? "Adding…" : added ? "Added ✓" : "Add to cart";

  return (
    <>
      {colourSelection && <ShadePicker value={shade} onChange={setShade} />}
      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-2xl font-medium text-accent">₹{unitPrice}</span>
        <span className="text-sm text-stone-500">/ {unit}</span>
      </div>

      {/* Stock/store line — only shown once we actually know (a pincode is
         set and the check has come back); no placeholder guess otherwise. */}
      {pincode && stockChecked && !stock?.available && (
        <p className="mt-1 text-sm">
          <span className="text-danger">Unavailable in your delivery area</span>
        </p>
      )}

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-stone-700">
          Quantity ({unit}s)
        </label>
        <div className="flex items-center rounded-card border border-line overflow-hidden">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="min-h-11 min-w-11 flex items-center justify-center text-stone-600 hover:bg-stone-100"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="w-14 min-h-11 text-center outline-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="min-h-11 min-w-11 flex items-center justify-center text-stone-600 hover:bg-stone-100"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <div className="font-medium text-stone-900">₹{total} total</div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {/* Desktop: inline button, buy box is already on screen. */}
      <button
        onClick={addToCart}
        disabled={
          adding ||
          (colourSelection && !shade) ||
          !!(pincode && stockChecked && !stock?.available)
        }
        className="hidden sm:inline-flex mt-5 items-center min-h-11 rounded-card bg-accent text-white px-5 font-medium hover:bg-accent-hover disabled:opacity-60"
      >
        {buttonLabel}
      </button>

      {/* Mobile: sticky bar so add-to-cart is always reachable without
         scrolling back up, clear of the home-indicator/notch area. */}
      <div
        className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line px-4 pt-3 flex items-center gap-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="font-medium text-stone-900 shrink-0">₹{total}</div>
        <button
          onClick={addToCart}
          disabled={
            adding ||
            (colourSelection && !shade) ||
            !!(pincode && stockChecked && !stock?.available)
          }
          className="flex-1 min-h-11 rounded-card bg-accent text-white px-5 font-medium disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      </div>
    </>
  );
}
