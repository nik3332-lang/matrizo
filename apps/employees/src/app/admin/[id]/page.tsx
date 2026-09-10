'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Employee = {
  id: string;
  email: string | null;
  name: string | null;
  active: boolean;
  phone: string | null;
  contactAddress: string | null;
  joinedAt: string;
};
type Commission = {
  commissionRatePercent: number;
  totalSales: number;
  totalCommission: number;
  currentMonth: string;
  monthSales: number;
  monthCommission: number;
};
type SalesEntry = { id: string; date: string; amount: number; notes: string | null };

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<{ employee: Employee; commission: Commission; entries: SalesEntry[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', contactAddress: '', commissionRatePercent: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get<{ employee: Employee; commission: Commission; entries: SalesEntry[] }>(`/admin/employees/${id}`)
      .then((res) => {
        setData(res);
        setForm({
          name: res.employee.name ?? '',
          phone: res.employee.phone ?? '',
          contactAddress: res.employee.contactAddress ?? '',
          commissionRatePercent: String(res.commission.commissionRatePercent),
          password: '',
        });
      });
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router, id]);

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/admin/employees/${id}`, {
        name: form.name.trim() || undefined,
        phone: form.phone.trim(),
        contactAddress: form.contactAddress.trim(),
        commissionRatePercent: parseFloat(form.commissionRatePercent) || undefined,
        password: form.password.trim() || undefined,
      });
      setEditing(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!data) return;
    try {
      await api.patch(`/admin/employees/${id}`, { active: !data.employee.active });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this employee.');
    }
  }

  if (!data) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            {data.employee.name}
            {!data.employee.active && <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 font-medium">Inactive</span>}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {data.employee.email} {data.employee.phone ? `· ${data.employee.phone}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing((v) => !v)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 border border-stone-300 hover:bg-stone-50">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={toggleActive} className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 border border-rose-200 hover:bg-rose-50">
            {data.employee.active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveEdits} className="glass rounded-xl p-4 space-y-3">
          <label className="block text-sm font-medium text-stone-700">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-stone-700">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Commission rate (%)
              <input
                type="number"
                min={0}
                step="0.1"
                value={form.commissionRatePercent}
                onChange={(e) => setForm((f) => ({ ...f, commissionRatePercent: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Contact address
            <textarea
              value={form.contactAddress}
              onChange={(e) => setForm((f) => ({ ...f, contactAddress: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Reset password (optional)
            <input
              type="password"
              minLength={8}
              placeholder="Leave blank to keep current password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-orange-700 text-white px-4 py-2 font-semibold shadow-sm hover:bg-brand-orange-800 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-brand-purple-800">{data.commission.commissionRatePercent}%</div>
          <div className="text-xs text-stone-500 mt-1">Commission rate</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-stone-900">₹{data.commission.totalSales.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">Total sales</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-brand-orange-700">₹{data.commission.totalCommission.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">Total commission</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Day-wise sales</h2>
        {data.entries.length === 0 && <p className="text-stone-500">No sales logged yet.</p>}
        <div className="glass rounded-xl divide-y divide-stone-100">
          {data.entries.map((entry) => (
            <div key={entry.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <span className="text-stone-700">{entry.date}</span>
                {entry.notes && <span className="text-stone-400 ml-2 text-xs">{entry.notes}</span>}
              </div>
              <div className="text-right">
                <div className="text-stone-900">₹{entry.amount.toFixed(2)}</div>
                <div className="text-xs text-brand-orange-700">
                  ₹{(Math.round(entry.amount * (data.commission.commissionRatePercent / 100) * 100) / 100).toFixed(2)} commission
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
