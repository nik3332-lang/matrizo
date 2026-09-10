import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { OrderStatus } from '@matrizo/shared';
import { PressableCard } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { STATUS_COLORS } from '@/lib/statusColors';

type Order = { id: string; status: OrderStatus; totalAmount: number; createdAt: string };

// STATUS_COLORS holds Tailwind class strings (shared data file, reused from
// apps/web) — this maps each to the literal hex pair the badge here needs,
// since a plain <Text> badge doesn't read arbitrary Tailwind classes for its
// background/text color the way a NativeWind className would.
const BADGE_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  placed: { bg: '#ebd9f0', text: '#4e1775' },
  confirmed: { bg: '#ffe1cc', text: '#c22f16' },
  picked: { bg: '#fae2dc', text: '#85331f' },
  dispatched: { bg: '#e7e5e4', text: '#44403c' },
  delivered: { bg: '#d1fae5', text: '#047857' },
  cancelled: { bg: '#ffe4e6', text: '#be123c' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!loading && user) api.get<{ orders: Order[] }>('/orders').then((res) => setOrders(res.orders));
  }, [loading, user]);

  if (!loading && !user) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center px-6">
        <Text className="text-stone-600 text-center mb-3">Log in to see your orders.</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text className="text-brand-orange-700 font-semibold">Log in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!orders) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerClassName="p-4 gap-3"
        ListEmptyComponent={
          <View className="items-center mt-12">
            <View className="h-14 w-14 rounded-full bg-brand-orange-50 items-center justify-center">
              <Icon name="package" size={26} color="#fe8a3d" />
            </View>
            <Text className="mt-4 text-stone-500">No orders yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = BADGE_COLORS[item.status];
          return (
            <PressableCard onPress={() => router.push(`/orders/${item.id}`)} className="flex-row items-center justify-between">
              <View>
                <Text className="font-semibold text-stone-900">Order #{item.id.slice(0, 8)}</Text>
                <Text className="text-sm text-stone-500 mt-0.5">{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <View className="items-end">
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: badge.bg }}>
                  <Text className="text-xs font-medium capitalize" style={{ color: badge.text }}>
                    {item.status}
                  </Text>
                </View>
                <Text className="text-sm text-stone-500 mt-1">₹{item.totalAmount}</Text>
              </View>
            </PressableCard>
          );
        }}
      />
    </SafeAreaView>
  );
}
