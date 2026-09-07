'use client';

import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type StaffMember = {
  id: string;
  role: 'store_staff' | 'delivery_partner' | 'admin';
  email: string | null;
  name: string | null;
  storeId: string | null;
  active: boolean;
};
type Store = { id: string; name: string };

const ROLE_LABELS: Record<string, string> = {
  store_staff: 'Store staff',
  delivery_partner: 'Delivery partner',
  admin: 'Admin',
};

const ROLE_CHIP: Record<string, string> = {
  store_staff: 'bg-brand-orange-100 text-brand-orange-800',
  delivery_partner: 'bg-brand-coral-100 text-brand-coral-800',
  admin: 'bg-stone-300 text-stone-800',
};

type FormValues = {
  email: string;
  password: string;
  name: string;
  role: 'store_staff' | 'delivery_partner' | 'admin';
  storeId: string;
};
const emptyForm: FormValues = { email: '', password: '', name: '', role: 'store_staff', storeId: '' };

export default function StaffPage() {
  const { user, loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [stores, setStores] = useState<Store[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<{ users: StaffMember[] }>('/admin/users').then((res) => setStaff(res.users));
    api.get<{ stores: Store[] }>('/admin/stores').then((res) => setStores(res.stores));
  }

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') load();
  }, [authLoading, user]);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/admin/users', {
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
        storeId: form.role === 'admin' ? undefined : form.storeId,
      });
      setCreating(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    try {
      await api.patch(`/admin/users/${member.id}`, { active: !member.active });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update account.');
    }
  }

  if (!authLoading && user?.role !== 'admin') {
    return <p className="text-stone-600">Only admins can manage staff accounts.</p>;
  }
  if (!staff || !stores) return <p className="text-stone-500">Loading…</p>;

  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.name ?? '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-stone-900">Staff accounts</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-gradient-to-r from-brand-orange-600 to-brand-purple-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:from-brand-orange-700 hover:to-brand-purple-700"
          >
            + Add staff
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {creating && (
        <form onSubmit={createStaff} className="glass rounded-2xl p-5 space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-stone-700">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as FormValues['role'] }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              >
                <option value="store_staff">Store staff</option>
                <option value="delivery_partner">Delivery partner</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-stone-700">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Password
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
            </label>
          </div>
          {form.role !== 'admin' && (
            <label className="block text-sm font-medium text-stone-700">
              Store
              <select
                required
                value={form.storeId}
                onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              >
                <option value="" disabled>
                  Select a store…
                </option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-brand-orange-600 to-brand-purple-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:from-brand-orange-700 hover:to-brand-purple-700 disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {staff.map((member) => (
          <div key={member.id} className="glass rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-stone-900">{member.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_CHIP[member.role]}`}>
                  {ROLE_LABELS[member.role]}
                </span>
                {!member.active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 font-medium">
                    Deactivated
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {member.email}
                {member.storeId && <> · {storeName(member.storeId)}</>}
              </div>
            </div>
            <button
              onClick={() => toggleActive(member)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                member.active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {member.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        ))}
        {staff.length === 0 && <p className="text-stone-500">No staff accounts yet.</p>}
      </div>
    </div>
  );
}
