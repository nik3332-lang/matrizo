'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type SalesEntry = { id: string; date: string; amount: number; notes: string | null };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesEntryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<SalesEntry[] | null>(null);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load(m: string) {
    api.get<{ entries: SalesEntry[] }>(`/employees/me/sales?month=${m}`).then((res) => setEntries(res.entries));
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'sales_employee') {
      router.replace('/admin');
      return;
    }
    load(month);
  }, [authLoading, user, router, month]);

  // Editing an existing day fills the form from the list instead of typing
  // the date by hand — the PUT endpoint is an upsert either way.
  function editEntry(entry: SalesEntry) {
    setDate(entry.date);
    setAmount(String(entry.amount));
    setNotes(entry.notes ?? '');
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/employees/me/sales/${date}`, { amount: parsedAmount, notes: notes.trim() || undefined });
      setSaved(true);
      load(date.slice(0, 7));
      setMonth(date.slice(0, 7));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this entry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-stone-900">Day-wise sales entry</h1>

      <form onSubmit={submit} className="glass rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-stone-700">
            Date
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              required
            />
          </label>
          <label className="text-sm font-medium text-stone-700">
            Sales amount (₹)
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              required
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-stone-700">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-orange-700 text-white px-4 py-2 font-semibold shadow-sm hover:bg-brand-orange-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save entry'}
        </button>
      </form>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">Entries</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>
        {!entries && <p className="text-stone-500">Loading…</p>}
        {entries && entries.length === 0 && <p className="text-stone-500">No entries for this month yet.</p>}
        <div className="space-y-2">
          {entries?.map((entry) => (
            <button
              key={entry.id}
              onClick={() => editEntry(entry)}
              className="glass w-full text-left rounded-xl p-3 flex items-center justify-between hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              <div>
                <div className="font-medium text-stone-900">{entry.date}</div>
                {entry.notes && <div className="text-xs text-stone-500 mt-0.5">{entry.notes}</div>}
              </div>
              <div className="font-bold text-brand-orange-700">₹{entry.amount.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
