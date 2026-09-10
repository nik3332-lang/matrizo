import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@matrizo/shared';
import { PressableCard } from '@/components/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const inputClass = 'w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900';

type OtpRequestResponse = { sent: true; devOtp?: string; note?: string };
type OtpVerifyResponse = { accessToken: string; user: { id: string; role: 'customer'; phone: string | null; name: string | null } };

// OTP is skipped for now — MSG91 isn't wired up yet, same dev-mode chain as
// apps/web/src/app/login/page.tsx: request + verify happen invisibly using
// the devOtp the API returns in dev mode instead of texting it.
async function authenticate(phone: string): Promise<OtpVerifyResponse> {
  const requestRes = await api.post<OtpRequestResponse>('/auth/otp/request', { phone });
  if (!requestRes.devOtp) {
    throw new ApiError('OTP was sent via SMS — enter it to continue (not implemented in this UI yet).', 500);
  }
  return api.post<OtpVerifyResponse>('/auth/otp/verify', { phone, code: requestRes.devOtp });
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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
    ]).catch(() => {});
    router.replace('/');
  }

  async function submitLogin() {
    setError(null);
    setBusy(true);
    try {
      const res = await authenticate(phone);
      login(res.accessToken, res.user);
      if (res.user.name) router.replace('/');
      else setStage('complete-profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function submitSignup() {
    setError(null);
    setBusy(true);
    try {
      const res = await authenticate(phone);
      login(res.accessToken, res.user);
      if (!res.user.name) {
        await Promise.all([
          api.patch('/account/me', { name }),
          api.post('/account/addresses', { line1, city, state, pincode, isDefault: true }),
        ]).catch(() => {});
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile() {
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
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <ScrollView contentContainerClassName="p-4 pb-10">
        {stage === 'form' && (
          <>
            <View className="flex-row bg-stone-100 rounded-full p-1 mb-5">
              <Pressable onPress={() => setMode('login')} className={`flex-1 rounded-full py-2 items-center ${mode === 'login' ? 'bg-white' : ''}`}>
                <Text className={`text-sm font-semibold ${mode === 'login' ? 'text-brand-orange-700' : 'text-stone-500'}`}>Log in</Text>
              </Pressable>
              <Pressable onPress={() => setMode('signup')} className={`flex-1 rounded-full py-2 items-center ${mode === 'signup' ? 'bg-white' : ''}`}>
                <Text className={`text-sm font-semibold ${mode === 'signup' ? 'text-brand-orange-700' : 'text-stone-500'}`}>Sign up</Text>
              </Pressable>
            </View>

            {mode === 'login' ? (
              <View className="gap-3">
                <Text className="text-xl font-bold text-stone-900">Welcome back</Text>
                <Text className="text-sm text-stone-500 -mt-2">Enter your phone number to continue.</Text>
                <View>
                  <Text className="text-sm font-medium text-stone-700 mb-1">Phone number</Text>
                  <TextInput value={phone} onChangeText={setPhone} placeholder="9876543210" keyboardType="phone-pad" className={inputClass} />
                </View>
                {error && <Text className="text-rose-600 text-sm">{error}</Text>}
                <PressableCard onPress={submitLogin} disabled={busy} className="bg-brand-orange-600 items-center py-3">
                  <Text className="text-white font-semibold">{busy ? 'Logging in…' : 'Log in'}</Text>
                </PressableCard>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-xl font-bold text-stone-900">Create your account</Text>
                <Text className="text-sm text-stone-500 -mt-2">Tell us where to deliver and you&apos;re in.</Text>
                <View>
                  <Text className="text-sm font-medium text-stone-700 mb-1">Phone number</Text>
                  <TextInput value={phone} onChangeText={setPhone} placeholder="9876543210" keyboardType="phone-pad" className={inputClass} />
                </View>
                <View>
                  <Text className="text-sm font-medium text-stone-700 mb-1">Name</Text>
                  <TextInput value={name} onChangeText={setName} placeholder="Your name" className={inputClass} />
                </View>
                <View>
                  <Text className="text-sm text-stone-500 mb-1.5">Delivery address</Text>
                  <View className="gap-2">
                    <TextInput value={line1} onChangeText={setLine1} placeholder="Address line" className={inputClass} />
                    <View className="flex-row gap-2">
                      <TextInput value={city} onChangeText={setCity} placeholder="City" className={`flex-1 ${inputClass}`} />
                      <TextInput value={state} onChangeText={setState} placeholder="State" className={`flex-1 ${inputClass}`} />
                    </View>
                    <TextInput value={pincode} onChangeText={setPincode} placeholder="Pincode" keyboardType="number-pad" className={inputClass} />
                  </View>
                </View>
                {error && <Text className="text-rose-600 text-sm">{error}</Text>}
                <PressableCard onPress={submitSignup} disabled={busy} className="bg-brand-orange-600 items-center py-3">
                  <Text className="text-white font-semibold">{busy ? 'Creating account…' : 'Sign up'}</Text>
                </PressableCard>
              </View>
            )}
          </>
        )}

        {stage === 'complete-profile' && (
          <View className="gap-3">
            <Text className="text-xl font-bold text-stone-900">You&apos;re logged in — one more step</Text>
            <Text className="text-sm text-stone-500 -mt-2">We don&apos;t have your name and address yet.</Text>
            <View>
              <Text className="text-sm font-medium text-stone-700 mb-1">Name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Your name" className={inputClass} />
            </View>
            <View>
              <Text className="text-sm text-stone-500 mb-1.5">Delivery address</Text>
              <View className="gap-2">
                <TextInput value={line1} onChangeText={setLine1} placeholder="Address line" className={inputClass} />
                <View className="flex-row gap-2">
                  <TextInput value={city} onChangeText={setCity} placeholder="City" className={`flex-1 ${inputClass}`} />
                  <TextInput value={state} onChangeText={setState} placeholder="State" className={`flex-1 ${inputClass}`} />
                </View>
                <TextInput value={pincode} onChangeText={setPincode} placeholder="Pincode" keyboardType="number-pad" className={inputClass} />
              </View>
            </View>
            {error && <Text className="text-rose-600 text-sm">{error}</Text>}
            <PressableCard onPress={submitProfile} disabled={busy} className="bg-brand-orange-600 items-center py-3">
              <Text className="text-white font-semibold">{busy ? 'Saving…' : 'Continue'}</Text>
            </PressableCard>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
