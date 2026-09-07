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

// OTP is skipped for now — MSG91 isn't wired up yet, so /auth/otp/request
// already returns the code directly (dev mode) instead of texting it.
// Rather than show that code and make someone type it back in, request +
// verify are chained invisibly. Explicitly temporary: once real SMS is
// live, this response stops carrying devOtp and a visible code-entry step
// needs to come back.
async function authenticate(phone: string): Promise<OtpVerifyResponse> {
  const requestRes = await api.post<OtpRequestResponse>('/auth/otp/request', { phone });
  if (!requestRes.devOtp) {
    throw new ApiError('OTP was sent via SMS — enter it to continue (not implemented in this UI yet).', 500);
  }
  return api.post<OtpVerifyResponse>('/auth/otp/verify', { phone, code: requestRes.devOtp });
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  // 'complete-profile': a "Log in" attempt turned out to be a brand-new
  // phone number — already authenticated at this point, just missing a
  // name/address, so ask for those instead of erroring out.
  const [stage, setStage] = useState<'form' | 'complete-profile'>('form');

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveProfileAndContinue() {
    await Promise.all([
      api.patch('/account/me', { name }),
      api.post('/account/addresses', { line1, city, state, pincode, isDefault: true }),
    ]).catch(() => {
      // Already logged in — don't block on this failing, they can fix it
      // later from checkout.
    });
    router.push('/');
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authenticate(phone);
      login(res.accessToken, res.user);
      if (res.user.name) {
        router.push('/');
      } else {
        // New phone number — logged in, but there's no profile yet.
        setStage('complete-profile');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authenticate(phone);
      login(res.accessToken, res.user);
      // Only fill in profile if it's genuinely new — a returning customer
      // who lands on the signup tab by mistake shouldn't get their name/
      // address overwritten.
      if (!res.user.name) {
        await Promise.all([
          api.patch('/account/me', { name }),
          api.post('/account/addresses', { line1, city, state, pincode, isDefault: true }),
        ]).catch(() => {});
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await saveProfileAndContinue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center -m-6 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400">
      <div className="glass w-full max-w-sm mx-4 rounded-2xl p-8">
        {stage === 'form' && (
          <>
            <div className="flex gap-1 mb-6 rounded-full bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition-colors ${
                  mode === 'login' ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500'
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition-colors ${
                  mode === 'signup' ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500'
                }`}
              >
                Sign up
              </button>
            </div>

            {mode === 'login' && (
              <form onSubmit={submitLogin} className="space-y-3">
                <h1 className="text-xl font-bold text-stone-900 mb-1">Welcome back</h1>
                <p className="text-sm text-stone-500 mb-4">Enter your phone number to continue.</p>
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
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-4 py-2.5 font-semibold shadow-sm hover:from-amber-700 hover:to-yellow-700 disabled:opacity-60"
                >
                  {busy ? 'Logging in…' : 'Log in'}
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={submitSignup} className="space-y-3">
                <h1 className="text-xl font-bold text-stone-900 mb-1">Create your account</h1>
                <p className="text-sm text-stone-500 mb-4">Tell us where to deliver and you&apos;re in.</p>
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
                    required
                  />
                </label>
                <div className="pt-1">
                  <p className="text-sm text-stone-500 mb-2">Delivery address</p>
                  <div className="space-y-2">
                    <input
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder="Address line"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                      required
                    />
                    <div className="flex gap-2">
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                        required
                      />
                      <input
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                        required
                      />
                    </div>
                    <input
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="Pincode"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-4 py-2.5 font-semibold shadow-sm hover:from-amber-700 hover:to-yellow-700 disabled:opacity-60"
                >
                  {busy ? 'Creating account…' : 'Sign up'}
                </button>
              </form>
            )}
          </>
        )}

        {stage === 'complete-profile' && (
          <form onSubmit={submitProfile} className="space-y-3">
            <h1 className="text-xl font-bold text-stone-900 mb-1">You&apos;re logged in — one more step</h1>
            <p className="text-sm text-stone-500 mb-4">We don&apos;t have your name and address yet.</p>
            <label className="block text-sm font-medium text-stone-700">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                required
              />
            </label>
            <div className="pt-1">
              <p className="text-sm text-stone-500 mb-2">Delivery address</p>
              <div className="space-y-2">
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Address line"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  required
                />
                <div className="flex gap-2">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                    required
                  />
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                    required
                  />
                </div>
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-4 py-2.5 font-semibold shadow-sm hover:from-amber-700 hover:to-yellow-700 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
