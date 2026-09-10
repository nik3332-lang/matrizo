import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, PressableCard } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type CartItem = { id: string; product: { id: string; name: string; unit: string }; quantity: number; unitPrice: number; lineTotal: number };
type Cart = { items: CartItem[]; subtotal: number };

export default function CartScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    api.get<Cart>('/cart').then(setCart);
  }

  useEffect(() => {
    if (!authLoading && user) reload();
  }, [authLoading, user]);

  async function updateQuantity(productId: string, quantity: number) {
    setBusyId(productId);
    try {
      const res = await api.patch<Cart>(`/cart/items/${productId}`, { quantity });
      setCart(res);
    } finally {
      setBusyId(null);
    }
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center px-6">
        <Text className="text-stone-600 text-center mb-3">Log in to view your cart.</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text className="text-brand-orange-700 font-semibold">Log in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!cart) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (cart.items.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center px-6">
        <View className="h-14 w-14 rounded-full bg-brand-orange-50 items-center justify-center">
          <Icon name="cart" size={26} color="#fe8a3d" />
        </View>
        <Text className="mt-4 text-stone-500">Your cart is empty.</Text>
        <Pressable onPress={() => router.push('/')} className="mt-1">
          <Text className="text-brand-orange-700 font-semibold">Browse categories</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <FlatList
        data={cart.items}
        keyExtractor={(i) => i.id}
        contentContainerClassName="p-4 gap-3"
        renderItem={({ item }) => (
          <Card className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-semibold text-stone-900">{item.product.name}</Text>
              <Text className="text-sm text-stone-500 mt-0.5">
                ₹{item.unitPrice} / {item.product.unit}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center rounded-lg border border-stone-300">
                <Pressable
                  disabled={busyId === item.product.id}
                  onPress={() => updateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                  className="px-2.5 py-1.5"
                >
                  <Icon name="minus" size={14} color="#57534e" />
                </Pressable>
                <TextInput
                  value={String(item.quantity)}
                  editable={false}
                  className="w-8 text-center text-stone-900"
                />
                <Pressable
                  disabled={busyId === item.product.id}
                  onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  className="px-2.5 py-1.5"
                >
                  <Icon name="plus" size={14} color="#57534e" />
                </Pressable>
              </View>
              <Text className="w-16 text-right font-semibold text-brand-orange-700">₹{item.lineTotal}</Text>
            </View>
          </Card>
        )}
        ListFooterComponent={
          <View className="mt-1 gap-3">
            <Card className="flex-row items-center justify-between">
              <Text className="text-stone-600 font-medium">Subtotal</Text>
              <Text className="text-lg font-bold text-brand-orange-700">₹{cart.subtotal}</Text>
            </Card>
            <PressableCard onPress={() => router.push('/checkout')} className="bg-brand-orange-600 items-center py-3.5">
              <Text className="text-white font-semibold">Proceed to checkout</Text>
            </PressableCard>
          </View>
        }
      />
    </SafeAreaView>
  );
}
