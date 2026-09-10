'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function NewEmployeePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionRatePercent, setCommissionRatePercent] = useState('5');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin') router.replace('/');
  }, [authLoading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ employee: { id: string } }>('/admin/employees', {
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        commissionRatePercent: parseFloat(commissionRatePercent) || 5,
      });
      router.push(`/admin/${res.employee.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this employee.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-stone-900 mb-4">Add sales employee</h1>
      <form onSubmit={submit} className="glass rounded-xl p-5 space-y-3">
        <label className="block text-sm font-medium text-stone-700">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-stone-700">
            Email (login)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              required
            />
          </label>
          <label className="text-sm font-medium text-stone-700">
            Password
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              required
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-stone-700">
            Phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
            />
          </label>
          <label className="text-sm font-medium text-stone-700">
            Commission rate (%)
            <input
              type="number"
              min={0}
              step="0.1"
              value={commissionRatePercent}
              onChange={(e) => setCommissionRatePercent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              required
            />
          </label>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-orange-700 text-white px-4 py-2 font-semibold shadow-sm hover:bg-brand-orange-800 disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create employee'}
        </button>
      </form>
    </div>
  );
}
