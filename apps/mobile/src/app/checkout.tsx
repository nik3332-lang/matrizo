import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@matrizo/shared';
import { Card, PressableCard } from '@/components/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Address = { id: string; line1: string; city: string; state: string; pincode: string };
type NewAddress = { line1: string; city: string; state: string; pincode: string };
const emptyAddress: NewAddress = { line1: '', city: '', state: '', pincode: '' };
const inputClass = 'w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<NewAddress>(emptyAddress);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    api.get<{ addresses: Address[] }>('/account/addresses').then((res) => {
      setAddresses(res.addresses);
      if (res.addresses.length === 0) setShowNewForm(true);
      else setSelectedId(res.addresses[0].id);
    });
  }, [authLoading, user]);

  async function saveAddress() {
    setError(null);
    try {
      const res = await api.post<{ address: Address }>('/account/addresses', newAddress);
      setAddresses((prev) => [...(prev ?? []), res.address]);
      setSelectedId(res.address.id);
      setShowNewForm(false);
      setNewAddress(emptyAddress);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save address.');
    }
  }

  async function placeOrder() {
    if (!selectedId) return;
    setError(null);
    setPlacing(true);
    try {
      const res = await api.post<{ orderId: string }>('/orders', { addressId: selectedId });
      router.replace(`/orders/${res.orderId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place order.');
    } finally {
      setPlacing(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-600">Please log in to check out.</Text>
      </SafeAreaView>
    );
  }
  if (!addresses) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pt-4 pb-8 gap-2">
        <Text className="text-xl font-bold text-stone-900 mb-2">Delivery address</Text>

        {addresses.map((addr) => (
          <Pressable key={addr.id} onPress={() => setSelectedId(addr.id)}>
            <Card className={`flex-row items-center gap-3 mb-2 ${selectedId === addr.id ? 'border-2 border-brand-orange-500' : ''}`}>
              <View className={`h-4 w-4 rounded-full border-2 ${selectedId === addr.id ? 'border-brand-orange-600' : 'border-stone-300'} items-center justify-center`}>
                {selectedId === addr.id && <View className="h-2 w-2 rounded-full bg-brand-orange-600" />}
              </View>
              <Text className="flex-1 text-stone-900">
                {addr.line1}, {addr.city}, {addr.state} – {addr.pincode}
              </Text>
            </Card>
          </Pressable>
        ))}

        {!showNewForm && (
          <Pressable onPress={() => setShowNewForm(true)} className="mt-1 mb-2">
            <Text className="text-brand-orange-700 font-semibold text-sm">+ Add a new address</Text>
          </Pressable>
        )}

        {showNewForm && (
          <Card className="gap-2.5 mt-2 mb-2">
            <TextInput placeholder="Address line" value={newAddress.line1} onChangeText={(v) => setNewAddress((a) => ({ ...a, line1: v }))} className={inputClass} />
            <View className="flex-row gap-2">
              <TextInput
                placeholder="City"
                value={newAddress.city}
                onChangeText={(v) => setNewAddress((a) => ({ ...a, city: v }))}
                className={`flex-1 ${inputClass}`}
              />
              <TextInput
                placeholder="State"
                value={newAddress.state}
                onChangeText={(v) => setNewAddress((a) => ({ ...a, state: v }))}
                className={`flex-1 ${inputClass}`}
              />
            </View>
            <TextInput
              placeholder="Pincode"
              value={newAddress.pincode}
              onChangeText={(v) => setNewAddress((a) => ({ ...a, pincode: v }))}
              keyboardType="number-pad"
              className={inputClass}
            />
            <PressableCard onPress={saveAddress} className="bg-brand-orange-600 items-center py-2.5">
              <Text className="text-white font-semibold text-sm">Save address</Text>
            </PressableCard>
          </Card>
        )}

        <Card className="mt-3">
          <Text className="font-semibold text-stone-900">Payment method</Text>
          <Text className="text-sm text-stone-500 mt-0.5">Cash on delivery (online payment coming soon)</Text>
        </Card>

        {error && <Text className="text-rose-600 text-sm mt-2">{error}</Text>}

        <PressableCard
          onPress={placeOrder}
          disabled={!selectedId || placing}
          className={`mt-4 items-center py-3.5 ${!selectedId || placing ? 'bg-stone-300' : 'bg-brand-orange-600'}`}
        >
          <Text className="text-white font-semibold">{placing ? 'Placing order…' : 'Place order'}</Text>
        </PressableCard>
      </ScrollView>
    </SafeAreaView>
  );
}
