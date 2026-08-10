import type { Order } from '@matrizo/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { api } from '../lib/api';

const STATUS_LABELS: Record<Order['status'], string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getOrders()
      .then((res) => setOrders(res.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#6B21A8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream px-5 pt-6">
      <Text className="text-2xl font-black text-ink">My Orders</Text>
      <FlatList
        className="mt-4"
        data={orders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-ink-body">You haven&apos;t placed any orders yet.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/order/${item.id}`)}
            className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4"
          >
            <View>
              <Text className="font-bold text-ink">Order #{item.id.slice(0, 8)}</Text>
              <Text className="mt-1 text-ink-body">{STATUS_LABELS[item.status]}</Text>
            </View>
            <Text className="font-extrabold text-purple">₹{item.totalAmount}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
