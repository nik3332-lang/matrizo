'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type OtpRequestResponse = { sent: true; devOtp?: string; note?: string };
type OtpVerifyResponse = {
  accessToken: string;
  user: { id: string; role: 'customer'; phone: string | null; name: string | null };
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<OtpRequestResponse>('/auth/otp/request', { phone });
      setDevOtp(res.devOtp ?? null);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<OtpVerifyResponse>('/auth/otp/verify', { phone, code });
      login(res.accessToken, res.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-6">Log in</h1>

      {step === 'phone' && (
        <form onSubmit={requestOtp} className="space-y-3">
          <label className="block text-sm">
            Phone number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              inputMode="tel"
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-neutral-900 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verifyOtp} className="space-y-3">
          {devOtp && (
            <p className="text-sm rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
              Test mode — your code is <strong>{devOtp}</strong> (SMS isn&apos;t wired up yet).
            </p>
          )}
          <label className="block text-sm">
            Enter the 6-digit code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-neutral-900 text-white px-4 py-2 font-medium disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Verify & log in'}
          </button>
        </form>
      )}
    </div>
  );
}
