'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth, type StaffUser } from '@/lib/auth';

type LoginResponse = { accessToken: string; user: StaffUser };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
      });
      login(res.accessToken, res.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center -m-6 py-14 sm:py-24 bg-brand-purple-800">
      <div className="glass w-full max-w-sm mx-4 rounded-2xl p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Matrizo Ops</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to manage orders, catalog & inventory.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              required
              autoComplete="username"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              required
              autoComplete="current-password"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-orange-700 text-white px-4 py-2.5 font-semibold shadow-sm hover:bg-brand-orange-800 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
