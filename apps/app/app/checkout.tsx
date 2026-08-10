import { ApiError, type Address, type DeliveryCheck } from '@matrizo/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { api } from '../lib/api';

const ADDRESS_FIELDS = ['label', 'line1', 'line2', 'city', 'state', 'pincode'] as const;

export default function CheckoutScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [delivery, setDelivery] = useState<DeliveryCheck | null>(null);
  const [form, setForm] = useState({ label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '' });

  useEffect(() => {
    api
      .getAddresses()
      .then((res) => {
        setAddresses(res.addresses);
        const defaultAddr = res.addresses.find((a) => a.isDefault) ?? res.addresses[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else setShowForm(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const selected = addresses.find((a) => a.id === selectedAddressId);
    if (!selected) {
      setDelivery(null);
      return;
    }
    api
      .checkDelivery(selected.pincode)
      .then(setDelivery)
      .catch(() => setDelivery(null));
  }, [selectedAddressId, addresses]);

  async function handleSaveAddress() {
    setError(null);
    if (!form.line1 || !form.city || !form.state || !/^\d{6}$/.test(form.pincode)) {
      setError('Please fill in all address fields with a valid 6-digit pincode.');
      return;
    }
    try {
      const res = await api.addAddress({ ...form, isDefault: addresses.length === 0 });
      const updated = await api.getAddresses();
      setAddresses(updated.addresses);
      setSelectedAddressId(res.id);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save address');
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) {
      setError('Please add or select a delivery address.');
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      const res = await api.createOrder(selectedAddressId, paymentMethod);
      router.replace(`/order/${res.orderId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#6B21A8" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream px-5 pt-4">
      <Text className="text-lg font-extrabold text-ink">Delivery Address</Text>

      {addresses.map((addr) => (
        <Pressable
          key={addr.id}
          onPress={() => setSelectedAddressId(addr.id)}
          className={`mt-3 rounded-xl border-2 bg-white p-4 ${
            selectedAddressId === addr.id ? 'border-purple' : 'border-transparent'
          }`}
        >
          <Text className="font-bold text-ink">{addr.label ?? 'Address'}</Text>
          <Text className="mt-1 text-ink-body">
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ''}
          </Text>
          <Text className="text-ink-body">
            {addr.city}, {addr.state} - {addr.pincode}
          </Text>
        </Pressable>
      ))}

      {selectedAddressId && delivery ? (
        <Text
          className={`mt-2 text-sm font-semibold ${delivery.serviceable ? 'text-purple' : 'text-orange'}`}
        >
          {delivery.serviceable
            ? `Deliverable in ~${delivery.etaMinutes} minutes`
            : "Sorry, we don't deliver to this pincode yet"}
        </Text>
      ) : null}

      <Pressable onPress={() => setShowForm((v) => !v)} className="mt-3">
        <Text className="font-bold text-purple">{showForm ? 'Cancel' : '+ Add new address'}</Text>
      </Pressable>

      {showForm ? (
        <View className="mt-3 rounded-xl bg-white p-4">
          {ADDRESS_FIELDS.map((field) => (
            <TextInput
              key={field}
              className="mb-3 rounded-lg border-2 border-purple px-3 py-2 text-ink"
              placeholder={
                field === 'line1'
                  ? 'Address line 1'
                  : field === 'line2'
                    ? 'Address line 2 (optional)'
                    : field.charAt(0).toUpperCase() + field.slice(1)
              }
              value={form[field]}
              onChangeText={(t) => setForm((f) => ({ ...f, [field]: t }))}
              keyboardType={field === 'pincode' ? 'number-pad' : 'default'}
              maxLength={field === 'pincode' ? 6 : undefined}
            />
          ))}
          <Pressable onPress={handleSaveAddress} className="items-center rounded-lg bg-purple py-3">
            <Text className="font-extrabold text-white">Save Address</Text>
          </Pressable>
        </View>
      ) : null}

      <Text className="mt-6 text-lg font-extrabold text-ink">Payment Method</Text>
      <View className="mt-3 flex-row gap-3">
        <Pressable
          onPress={() => setPaymentMethod('cod')}
          className={`flex-1 items-center rounded-xl border-2 bg-white py-4 ${
            paymentMethod === 'cod' ? 'border-purple' : 'border-transparent'
          }`}
        >
          <Text className="font-bold text-ink">Pay on Delivery</Text>
        </Pressable>
        <Pressable
          onPress={() => setPaymentMethod('razorpay')}
          className={`flex-1 items-center rounded-xl border-2 bg-white py-4 ${
            paymentMethod === 'razorpay' ? 'border-purple' : 'border-transparent'
          }`}
        >
          <Text className="font-bold text-ink">Pay Online</Text>
        </Pressable>
      </View>

      {error ? <Text className="mt-4 text-sm font-semibold text-orange">{error}</Text> : null}

      <Pressable
        disabled={placing}
        onPress={handlePlaceOrder}
        className={`my-6 items-center rounded-xl bg-purple py-4 ${placing ? 'opacity-50' : ''}`}
      >
        {placing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-extrabold text-white">Place Order</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
