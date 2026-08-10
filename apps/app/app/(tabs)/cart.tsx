import { ApiError, type Cart } from '@matrizo/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

export default function CartScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const loadCart = useCallback(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getCart()
      .then(setCart)
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(loadCart);

  async function updateQuantity(itemId: string, quantity: number) {
    setBusyItemId(itemId);
    try {
      if (quantity <= 0) {
        await api.removeCartItem(itemId);
      } else {
        await api.updateCartItem(itemId, quantity);
      }
      loadCart();
    } finally {
      setBusyItemId(null);
    }
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-cream px-8">
        <Text className="text-2xl font-black text-ink">Cart</Text>
        <Text className="mt-2 text-center text-ink-body">Log in to view your cart.</Text>
        <Pressable onPress={() => router.push('/login')} className="mt-6 rounded-xl bg-purple px-6 py-3">
          <Text className="font-extrabold text-white">Log In</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#6B21A8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream px-5 pt-6">
      <Text className="text-2xl font-black text-ink">Cart</Text>
      <FlatList
        className="mt-4"
        data={cart?.items ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-ink-body">Your cart is empty.</Text>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl bg-white p-4">
            <Text className="font-bold text-ink">{item.product.name}</Text>
            <View className="mt-2 flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                <Pressable
                  disabled={busyItemId === item.id}
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-cream"
                >
                  <Text className="font-extrabold text-purple">−</Text>
                </Pressable>
                <Text className="font-bold text-ink">{item.quantity}</Text>
                <Pressable
                  disabled={busyItemId === item.id}
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-cream"
                >
                  <Text className="font-extrabold text-purple">+</Text>
                </Pressable>
              </View>
              <Text className="font-extrabold text-purple">₹{item.lineTotal}</Text>
            </View>
          </View>
        )}
      />

      {cart && cart.items.length > 0 ? (
        <View className="border-t border-purple/20 pb-4 pt-4">
          <View className="flex-row justify-between">
            <Text className="text-lg font-bold text-ink">Subtotal</Text>
            <Text className="text-lg font-black text-purple">₹{cart.subtotal}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/checkout')}
            className="mt-4 items-center rounded-xl bg-purple py-4"
          >
            <Text className="font-extrabold text-white">Proceed to Checkout</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
