"use client";
import Link from "next/link";
import { useState } from "react";
import { ApiError, formatMoney } from "@matrizo/shared";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Icon } from "@/components/Icon";

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const cart = useCart();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function update(productId: string, quantity: number, shadeId?: string) {
    setBusy(productId);
    setError("");
    try {
      await cart.setQuantity(productId, quantity, shadeId);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Couldn’t update your basket. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }
  if (!authLoading && !user)
    return (
      <div className="empty-state">
        <h1>Make room for something good.</h1>
        <p className="my-4">Sign in to save your basket and place an order.</p>
        <Link href="/login?next=/cart" className="button-primary">
          Sign in to shop →
        </Link>
      </div>
    );
  if (cart.loading) return <p className="empty-state">Loading your basket…</p>;
  if (cart.error)
    return (
      <div className="notice" role="alert">
        {cart.error}
        <button onClick={cart.reload}>Try again</button>
      </div>
    );
  if (!cart.items.length)
    return (
      <div className="empty-state">
        <Icon name="cart" className="h-8 w-8 mx-auto mb-4" />
        <h1>Your next project is waiting.</h1>
        <p className="my-4">
          Your basket is empty. Find a few things you’ll love.
        </p>
        <Link href="/shop" className="button-primary">
          Explore the collection →
        </Link>
      </div>
    );
  return (
    <div>
      <div className="shop-heading">
        <span className="eyebrow">YOUR PROJECT, COMING TOGETHER</span>
        <h1>Your basket.</h1>
        <p>{cart.itemCount} items, one step closer to home.</p>
      </div>
      <div className="purchase-layout">
        <section className="purchase-panel basket-lines">
          {cart.items.map((item) => (
            <div className="basket-line" key={item.id}>
              <div>
                <h2>{item.product.name}</h2>
                {item.shade && (
                  <p>
                    {item.shade.name} · {item.shade.hex}
                  </p>
                )}
                <p>
                  {formatMoney(item.unitPrice)} / {item.product.unit}
                </p>
                <button
                  className="text-accent text-xs underline mt-2"
                  disabled={!!busy}
                  onClick={() => update(item.product.id, 0, item.shadeId)}
                >
                  Remove
                </button>
              </div>
              <div className="basket-controls">
                <div className="quantity-control">
                  <button
                    aria-label={`Decrease ${item.product.name}`}
                    disabled={!!busy}
                    onClick={() =>
                      update(item.product.id, item.quantity - 1, item.shadeId)
                    }
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    aria-label={`Increase ${item.product.name}`}
                    disabled={!!busy}
                    onClick={() =>
                      update(item.product.id, item.quantity + 1, item.shadeId)
                    }
                  >
                    +
                  </button>
                </div>
                <strong>{formatMoney(item.lineTotal)}</strong>
              </div>
            </div>
          ))}
        </section>
        <aside className="purchase-panel order-summary">
          <span className="eyebrow">ORDER SUMMARY</span>
          <div className="summary-total">
            <span>Subtotal</span>
            <strong>{formatMoney(cart.subtotal)}</strong>
          </div>
          <p>
            Delivery availability is checked against your address and local
            stock at checkout.
          </p>
          <Link href="/checkout" className="button-primary">
            Continue to checkout →
          </Link>
          <Link href="/shop" className="continue-shopping">
            Keep exploring
          </Link>
        </aside>
      </div>
      {error && (
        <p className="notice mt-4" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
