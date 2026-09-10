import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@matrizo/shared';
import { Card, PressableCard } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Address = { id: string; line1: string; city: string; state: string; pincode: string; isDefault: boolean };
type AddressForm = { line1: string; city: string; state: string; pincode: string };
const emptyForm: AddressForm = { line1: '', city: '', state: '', pincode: '' };

const inputClass = 'w-full rounded-lg border border-stone-300 px-3 py-2.5 text-stone-900';

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<{ addresses: Address[] }>('/account/addresses').then((res) => setAddresses(res.addresses));
  }

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user]);

  function startEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({ line1: addr.line1, city: addr.city, state: addr.state, pincode: addr.pincode });
    setError(null);
  }

  async function saveAddress() {
    if (!form.line1 || !form.city || !form.state || !form.pincode) {
      setError('Fill in every field.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingId === 'new') await api.post('/account/addresses', form);
      else if (editingId) await api.patch(`/account/addresses/${editingId}`, form);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save address.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete address?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/account/addresses/${id}`);
            load();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not delete address.');
          }
        },
      },
    ]);
  }

  async function setDefault(id: string) {
    try {
      await api.patch(`/account/addresses/${id}`, { isDefault: true });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update address.');
    }
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center px-6">
        <Text className="text-stone-600 text-center mb-3">Log in to view your account.</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text className="text-brand-orange-700 font-semibold">Log in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (authLoading || !user) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pt-4 pb-8 gap-6">
        <Card className="flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-full bg-brand-purple-100 items-center justify-center">
            <Icon name="user" size={22} color="#4e1775" />
          </View>
          <View>
            <Text className="font-semibold text-stone-900 text-base">{user.name ?? '—'}</Text>
            <Text className="text-sm text-stone-500">{user.phone}</Text>
          </View>
        </Card>

        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-stone-900">Saved addresses</Text>
            {editingId === null && (
              <Pressable
                onPress={() => {
                  setEditingId('new');
                  setForm(emptyForm);
                  setError(null);
                }}
              >
                <Text className="text-brand-orange-700 font-semibold text-sm">+ Add address</Text>
              </Pressable>
            )}
          </View>

          {error && <Text className="text-rose-600 text-sm mb-3">{error}</Text>}

          {editingId && (
            <Card className="gap-2.5 mb-3">
              <TextInput placeholder="Address line" value={form.line1} onChangeText={(v) => setForm((f) => ({ ...f, line1: v }))} className={inputClass} />
              <View className="flex-row gap-2">
                <TextInput
                  placeholder="City"
                  value={form.city}
                  onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                  className={`flex-1 ${inputClass}`}
                />
                <TextInput
                  placeholder="State"
                  value={form.state}
                  onChangeText={(v) => setForm((f) => ({ ...f, state: v }))}
                  className={`flex-1 ${inputClass}`}
                />
              </View>
              <TextInput
                placeholder="Pincode"
                value={form.pincode}
                onChangeText={(v) => setForm((f) => ({ ...f, pincode: v }))}
                keyboardType="number-pad"
                className={inputClass}
              />
              <View className="flex-row gap-2 mt-1">
                <PressableCard onPress={saveAddress} className="bg-brand-orange-600 px-4 py-2">
                  <Text className="text-white font-semibold text-sm">{busy ? 'Saving…' : 'Save'}</Text>
                </PressableCard>
                <Pressable onPress={() => setEditingId(null)} className="px-4 py-2 justify-center">
                  <Text className="text-stone-600 font-medium text-sm">Cancel</Text>
                </Pressable>
              </View>
            </Card>
          )}

          {!addresses && <Text className="text-stone-500">Loading…</Text>}
          {addresses && addresses.length === 0 && !editingId && <Text className="text-stone-500">No addresses saved yet.</Text>}
          <View className="gap-2">
            {addresses
              ?.filter((a) => a.id !== editingId)
              .map((addr) => (
                <Card key={addr.id}>
                  <Text className="text-stone-900">
                    {addr.line1}, {addr.city}, {addr.state} – {addr.pincode}
                  </Text>
                  {addr.isDefault && (
                    <Text className="mt-1.5 self-start text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      Default
                    </Text>
                  )}
                  <View className="flex-row gap-4 mt-2">
                    {!addr.isDefault && (
                      <Pressable onPress={() => setDefault(addr.id)}>
                        <Text className="text-brand-orange-700 text-xs font-semibold">Set default</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => startEdit(addr)}>
                      <Text className="text-brand-orange-700 text-xs font-semibold">Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(addr.id)}>
                      <Text className="text-rose-600 text-xs font-semibold">Delete</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
          </View>
        </View>

        <PressableCard onPress={logout} className="flex-row items-center gap-2 justify-center">
          <Icon name="logout" size={16} color="#57534e" />
          <Text className="text-stone-700 font-semibold">Log out</Text>
        </PressableCard>
      </ScrollView>
    </SafeAreaView>
  );
}
