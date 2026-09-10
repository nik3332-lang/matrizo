'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Address = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type AddressForm = { line1: string; city: string; state: string; pincode: string };
const emptyForm: AddressForm = { line1: '', city: '', state: '', pincode: '' };

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<{ addresses: Address[] }>('/account/addresses').then((res) => setAddresses(res.addresses));
  }

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user]);

  function startEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({ line1: addr.line1, city: addr.city, state: addr.state, pincode: addr.pincode });
    setError(null);
  }

  function startNew() {
    setEditingId('new');
    setForm(emptyForm);
    setError(null);
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editingId === 'new') {
        await api.post('/account/addresses', form);
      } else if (editingId) {
        await api.patch(`/account/addresses/${editingId}`, form);
      }
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save address.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!confirm('Delete this address?')) return;
    setError(null);
    try {
      await api.delete(`/account/addresses/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete address.');
    }
  }

  async function setDefault(id: string) {
    setError(null);
    try {
      await api.patch(`/account/addresses/${id}`, { isDefault: true });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update address.');
    }
  }

  if (!authLoading && !user) {
    return (
      <p className="text-stone-600">
        <Link href="/login" className="text-brand-orange-700 font-medium underline">
          Log in
        </Link>{' '}
        to view your account.
      </p>
    );
  }
  if (authLoading || !user) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-bold text-stone-900 mb-4">Your account</h1>
        <div className="glass rounded-xl p-4">
          <div className="font-semibold text-stone-900">{user.name ?? '—'}</div>
          <div className="text-sm text-stone-500">{user.phone}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">Saved addresses</h2>
          {editingId === null && (
            <button onClick={startNew} className="text-sm font-medium text-brand-orange-700 underline">
              + Add address
            </button>
          )}
        </div>

        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

        {editingId && (
          <form onSubmit={saveAddress} className="glass rounded-xl p-4 space-y-3 mb-3">
            <input
              required
              placeholder="Address line"
              value={form.line1}
              onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
            />
            <div className="flex gap-2">
              <input
                required
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
              <input
                required
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
            </div>
            <input
              required
              placeholder="Pincode"
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              inputMode="numeric"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-brand-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-brand-orange-800 disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!addresses && <p className="text-stone-500">Loading…</p>}
        {addresses && addresses.length === 0 && !editingId && (
          <p className="text-stone-500">No addresses saved yet.</p>
        )}
        <div className="space-y-2">
          {addresses
            ?.filter((a) => a.id !== editingId)
            .map((addr) => (
              <div key={addr.id} className="glass rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="text-stone-900">
                    {addr.line1}, {addr.city}, {addr.state} – {addr.pincode}
                  </div>
                  {addr.isDefault && (
                    <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-3 shrink-0 text-xs font-medium">
                  {!addr.isDefault && (
                    <button onClick={() => setDefault(addr.id)} className="text-brand-orange-700 hover:underline">
                      Set default
                    </button>
                  )}
                  <button onClick={() => startEdit(addr)} className="text-brand-orange-700 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => deleteAddress(addr.id)} className="text-rose-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div>
        <Link
          href="/orders"
          className="glass block rounded-xl p-4 flex items-center justify-between hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          <span className="font-semibold text-stone-900">Order history</span>
          <span className="text-brand-orange-700">→</span>
        </Link>
      </div>
    </div>
  );
}
