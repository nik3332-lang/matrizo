import type { Order, OrderItem } from '@matrizo/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { api } from '../../lib/api';

const STATUS_LABELS: Record<Order['status'], string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getOrder(id)
      .then((res) => {
        setOrder(res.order);
        setItems(res.items);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#6B21A8" />
      </View>
    );
  }
  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-cream px-8">
        <Text className="text-ink-body">Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream px-5 pt-6">
      <Stack.Screen options={{ title: `Order #${order.id.slice(0, 8)}` }} />

      <View className="items-center rounded-xl bg-white p-6">
        <Text className="text-3xl">✅</Text>
        <Text className="mt-2 text-xl font-black text-ink">{STATUS_LABELS[order.status]}</Text>
        <Text className="mt-1 text-ink-body">
          {order.paymentMethod === 'cod' ? 'Pay on Delivery' : 'Paid Online'} · ₹{order.totalAmount}
        </Text>
      </View>

      <Text className="mt-6 font-extrabold text-ink">Items</Text>
      {items.map((item) => (
        <View key={item.id} className="mt-2 flex-row justify-between rounded-xl bg-white p-3">
          <Text className="flex-1 text-ink">
            {item.productName} × {item.quantity}
          </Text>
          <Text className="font-bold text-ink">₹{item.unitPrice * item.quantity}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
