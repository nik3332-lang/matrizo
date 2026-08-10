import { ApiError } from '@matrizo/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phone);
      setDevOtp(res.devOtp ?? null);
      setStep('otp');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, code);
      await login(res);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const canSendOtp = phone.length === 10 && !loading;
  const canVerify = code.length === 6 && !loading;

  return (
    <View className="flex-1 bg-cream px-6 pt-8">
      {step === 'phone' ? (
        <>
          <Text className="text-2xl font-black text-ink">Log in to Matrizo</Text>
          <Text className="mt-1 text-ink-body">We&apos;ll send you a one-time code by SMS.</Text>

          <View className="mt-6 flex-row items-center rounded-xl border-2 border-purple bg-white px-4">
            <Text className="mr-2 font-bold text-ink">+91</Text>
            <TextInput
              className="flex-1 py-3 text-base text-ink"
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
            />
          </View>

          {error ? <Text className="mt-3 text-sm font-semibold text-orange">{error}</Text> : null}

          <Pressable
            disabled={!canSendOtp}
            onPress={handleSendOtp}
            className={`mt-6 items-center rounded-xl bg-purple py-4 ${canSendOtp ? '' : 'opacity-50'}`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-extrabold text-white">Send OTP</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text className="text-2xl font-black text-ink">Enter the code</Text>
          <Text className="mt-1 text-ink-body">Sent to +91 {phone}</Text>

          {devOtp ? (
            <Text className="mt-2 text-sm font-semibold text-purple">
              Dev mode (no SMS provider configured yet) — your code is {devOtp}
            </Text>
          ) : null}

          <TextInput
            className="mt-6 rounded-xl border-2 border-purple bg-white px-4 py-3 text-center text-2xl text-ink"
            keyboardType="number-pad"
            maxLength={6}
            placeholder="------"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
          />

          {error ? <Text className="mt-3 text-sm font-semibold text-orange">{error}</Text> : null}

          <Pressable
            disabled={!canVerify}
            onPress={handleVerify}
            className={`mt-6 items-center rounded-xl bg-purple py-4 ${canVerify ? '' : 'opacity-50'}`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-extrabold text-white">Verify & Continue</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setStep('phone')} className="mt-4 items-center">
            <Text className="font-semibold text-purple">Change number</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
