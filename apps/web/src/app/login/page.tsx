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
    <div className="min-h-[80vh] flex items-center justify-center -m-6 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400">
      <div className="glass w-full max-w-sm mx-4 rounded-2xl p-8">
        <h1 className="text-xl font-bold text-stone-900 mb-1">Log in</h1>
        <p className="text-sm text-stone-500 mb-6">Fast delivery starts with your phone number.</p>

        {step === 'phone' && (
          <form onSubmit={requestOtp} className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">
              Phone number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                inputMode="tel"
                required
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
              />
            </label>
            <div className="pt-1">
              <p className="text-sm text-stone-500 mb-2">
                Delivery address <span className="text-stone-400">(you can skip and add this later)</span>
              </p>
              <div className="space-y-2">
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Address line"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  />
                </div>
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  inputMode="numeric"
                />
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-4 py-2.5 font-semibold shadow-sm hover:from-amber-700 hover:to-yellow-700 disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyOtp} className="space-y-3">
            {devOtp && (
              <p className="text-sm rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
                Test mode — your code is <strong>{devOtp}</strong> (SMS isn&apos;t wired up yet).
              </p>
            )}
            <label className="block text-sm font-medium text-stone-700">
              Enter the 6-digit code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                inputMode="numeric"
                maxLength={6}
                required
              />
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-4 py-2.5 font-semibold shadow-sm hover:from-amber-700 hover:to-yellow-700 disabled:opacity-60"
            >
              {busy ? 'Verifying…' : 'Verify & log in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
