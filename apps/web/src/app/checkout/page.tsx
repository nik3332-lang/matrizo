'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Address = {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

type NewAddress = { line1: string; city: string; state: string; pincode: string };

const emptyAddress: NewAddress = { line1: '', city: '', state: '', pincode: '' };

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<NewAddress>(emptyAddress);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    api.get<{ addresses: Address[] }>('/account/addresses').then((res) => {
      setAddresses(res.addresses);
      if (res.addresses.length === 0) setShowNewForm(true);
      else setSelectedId(res.addresses[0].id);
    });
  }, [authLoading, user]);

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post<{ address: Address }>('/account/addresses', newAddress);
      setAddresses((prev) => [...(prev ?? []), res.address]);
      setSelectedId(res.address.id);
      setShowNewForm(false);
      setNewAddress(emptyAddress);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save address.');
    }
  }

  async function placeOrder() {
    if (!selectedId) return;
    setError(null);
    setPlacing(true);
    try {
      const res = await api.post<{ orderId: string }>('/orders', { addressId: selectedId });
      router.push(`/orders/${res.orderId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place order.');
    } finally {
      setPlacing(false);
    }
  }

  if (!authLoading && !user) {
    return <p className="text-neutral-600">Please log in to check out.</p>;
  }
  if (!addresses) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Delivery address</h1>

      <div className="space-y-2">
        {addresses.map((addr) => (
          <label
            key={addr.id}
            className={`block rounded-md border p-3 cursor-pointer ${
              selectedId === addr.id ? 'border-neutral-900' : 'border-neutral-200'
            }`}
          >
            <input
              type="radio"
              name="address"
              className="mr-2"
              checked={selectedId === addr.id}
              onChange={() => setSelectedId(addr.id)}
            />
            {addr.line1}, {addr.city}, {addr.state} – {addr.pincode}
          </label>
        ))}
      </div>

      {!showNewForm && (
        <button onClick={() => setShowNewForm(true)} className="mt-3 text-sm underline text-neutral-600">
          + Add a new address
        </button>
      )}

      {showNewForm && (
        <form onSubmit={saveAddress} className="mt-4 space-y-3 rounded-md border border-neutral-200 p-4">
          <input
            required
            placeholder="Address line"
            value={newAddress.line1}
            onChange={(e) => setNewAddress((a) => ({ ...a, line1: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
          <div className="flex gap-2">
            <input
              required
              placeholder="City"
              value={newAddress.city}
              onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
              className="w-1/2 rounded-md border border-neutral-300 px-3 py-2"
            />
            <input
              required
              placeholder="State"
              value={newAddress.state}
              onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))}
              className="w-1/2 rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
          <input
            required
            placeholder="Pincode"
            value={newAddress.pincode}
            onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value }))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            inputMode="numeric"
          />
          <button type="submit" className="rounded-md bg-neutral-900 text-white px-4 py-2 font-medium">
            Save address
          </button>
        </form>
      )}

      <div className="mt-6 rounded-md border border-neutral-200 p-4">
        <div className="font-medium">Payment method</div>
        <div className="text-sm text-neutral-500">Cash on delivery (online payment coming soon)</div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={placeOrder}
        disabled={!selectedId || placing}
        className="mt-4 w-full rounded-md bg-neutral-900 text-white px-5 py-2 font-medium disabled:opacity-60"
      >
        {placing ? 'Placing order…' : 'Place order'}
      </button>
    </div>
  );
}
