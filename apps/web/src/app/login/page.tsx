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
  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
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

      // First-time customer: this phone had no name on file yet, so save
      // the name + address collected on the previous screen now that we're
      // authenticated. A returning customer already has these — don't
      // overwrite their name or add a duplicate address on every login.
      if (!res.user.name && (name || line1)) {
        await Promise.all([
          name ? api.patch('/account/me', { name }) : Promise.resolve(),
          line1 && city && state && pincode
            ? api.post('/account/addresses', { line1, city, state, pincode, isDefault: true })
            : Promise.resolve(),
        ]).catch(() => {
          // Login already succeeded — don't block on profile completion
          // failing; the customer can add these later from checkout.
        });
      }

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
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <div className="pt-1">
            <p className="text-sm text-neutral-500 mb-2">
              Delivery address <span className="text-neutral-400">(you can skip and add this later)</span>
            </p>
            <div className="space-y-2">
              <input
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Address line"
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
              <div className="flex gap-2">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-1/2 rounded-md border border-neutral-300 px-3 py-2"
                />
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-1/2 rounded-md border border-neutral-300 px-3 py-2"
                />
              </div>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Pincode"
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                inputMode="numeric"
              />
            </div>
          </div>
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
