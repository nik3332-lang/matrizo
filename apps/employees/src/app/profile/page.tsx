'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Employee = { id: string; email: string | null; name: string | null; phone: string | null; contactAddress: string | null; joinedAt: string };

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    api.get<{ employee: Employee }>('/employees/me').then((res) => {
      setEmployee(res.employee);
      setName(res.employee.name ?? '');
      setPhone(res.employee.phone ?? '');
      setContactAddress(res.employee.contactAddress ?? '');
    });
  }, [authLoading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await api.patch<{ employee: Employee }>('/employees/me', {
        name: name.trim() || undefined,
        phone: phone.trim(),
        contactAddress: contactAddress.trim(),
      });
      setEmployee(res.employee);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  if (!employee) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-stone-900">Your profile</h1>

      <form onSubmit={submit} className="glass rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-stone-700">
          Email
          <input value={employee.email ?? ''} disabled className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-500" />
          <span className="text-xs text-stone-400">Contact an admin to change your login email.</span>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
            required
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Phone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Contact address
          <textarea
            value={contactAddress}
            onChange={(e) => setContactAddress(e.target.value)}
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
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
