"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, formatMoney } from "@matrizo/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

type Address = {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};
type NewAddress = {
  line1: string;
  city: string;
  state: string;
  pincode: string;
};
const emptyAddress: NewAddress = {
  line1: "",
  city: "",
  state: "",
  pincode: "",
};
export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const cart = useCart();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<NewAddress>(emptyAddress);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    if (authLoading || !user) return;
    let current = true;
    api
      .get<{ addresses: Address[] }>("/account/addresses")
      .then((res) => {
        if (!current) return;
        setAddresses(res.addresses);
        if (!res.addresses.length) setShowNewForm(true);
        else setSelectedId(res.addresses[0].id);
      })
      .catch(() => {
        if (current)
          setError(
            "Your addresses couldn’t load. Please refresh and try again.",
          );
      });
    return () => {
      current = false;
    };
  }, [authLoading, user]);
  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.post<{ address: Address }>(
        "/account/addresses",
        newAddress,
      );
      setAddresses((prev) => [...(prev ?? []), res.address]);
      setSelectedId(res.address.id);
      setShowNewForm(false);
      setNewAddress(emptyAddress);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save address.");
    } finally {
      setSaving(false);
    }
  }
  async function placeOrder() {
    if (!selectedId || placing || placed) return;
    setError(null);
    setPlacing(true);
    try {
      const res = await api.post<{ orderId: string }>("/orders", {
        addressId: selectedId,
      });
      setPlaced(true);
      cart.clear();
      router.push(`/orders/${res.orderId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not place order.");
    } finally {
      setPlacing(false);
    }
  }
  if (!authLoading && !user)
    return (
      <div className="empty-state">
        <p className="mb-4">Sign in to complete your order.</p>
        <Link className="button-primary" href="/login?next=/checkout">
          Sign in →
        </Link>
      </div>
    );
  if (placed)
    return (
      <p className="empty-state" role="status">
        Your order is placed. Opening your order details…
      </p>
    );
  if (!addresses || cart.loading)
    return (
      <p className="empty-state" role={error ? "alert" : undefined}>
        {error ?? "Getting your checkout ready…"}
      </p>
    );
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
        <p className="mb-4">Add something to your basket first.</p>
        <Link className="button-primary" href="/shop">
          Explore the collection →
        </Link>
      </div>
    );
  return (
    <div>
      <div className="shop-heading">
        <span className="eyebrow">THE FINISHING TOUCH</span>
        <h1>Make it yours.</h1>
        <p>Choose where your next project begins.</p>
      </div>
      <div className="purchase-layout">
        <section className="purchase-panel checkout-details">
          <h2>Delivery details</h2>
          <p className="text-sm text-slate-500 mb-5">
            {user?.name}
            {user?.phone ? ` · ${user.phone}` : ""}
          </p>
          <div className="space-y-3">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`address-choice ${selectedId === addr.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedId === addr.id}
                  onChange={() => setSelectedId(addr.id)}
                />
                <span>
                  {addr.line1}
                  <small>
                    {addr.city}, {addr.state} — {addr.pincode}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="text-accent text-sm underline mt-5"
            >
              + Add another address
            </button>
          )}
          {showNewForm && (
            <form className="address-form" onSubmit={saveAddress}>
              <label>
                House, street and landmark
                <input
                  required
                  autoComplete="street-address"
                  maxLength={250}
                  value={newAddress.line1}
                  onChange={(e) =>
                    setNewAddress((a) => ({ ...a, line1: e.target.value }))
                  }
                />
              </label>
              <div className="address-row">
                <label>
                  City
                  <input
                    required
                    autoComplete="address-level2"
                    maxLength={100}
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress((a) => ({ ...a, city: e.target.value }))
                    }
                  />
                </label>
                <label>
                  State
                  <input
                    required
                    autoComplete="address-level1"
                    maxLength={100}
                    value={newAddress.state}
                    onChange={(e) =>
                      setNewAddress((a) => ({ ...a, state: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label>
                Pincode
                <input
                  required
                  autoComplete="postal-code"
                  pattern="[1-9][0-9]{5}"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="6-digit delivery pincode"
                  value={newAddress.pincode}
                  onChange={(e) =>
                    setNewAddress((a) => ({ ...a, pincode: e.target.value }))
                  }
                />
              </label>
              <button
                type="submit"
                className="button-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Use this address"}
              </button>
            </form>
          )}
        </section>
        <aside className="purchase-panel order-summary">
          <span className="eyebrow">YOUR ORDER</span>
          <div className="checkout-items">
            {cart.items.map((item) => (
              <div key={item.id}>
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <strong>{formatMoney(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{formatMoney(cart.subtotal)}</strong>
          </div>
          <div className="payment-note">
            <strong>Cash on delivery</strong>
            <p>Pay when your order arrives.</p>
          </div>
          <button
            onClick={placeOrder}
            disabled={!selectedId || placing || saving}
            className="button-primary"
          >
            {placing ? "Placing your order…" : "Place order · Pay on delivery"}
          </button>
          <Link className="continue-shopping" href="/cart">
            Back to your basket
          </Link>
        </aside>
      </div>
      {error && (
        <p className="notice mt-5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
