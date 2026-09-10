import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, ORDER_STATUSES } from '@matrizo/shared';
import { Card } from '@/components/Card';
import { api, wsUrl } from '@/lib/api';

type OrderItem = { id: string; productName: string; quantity: number; unitPrice: number };
type StatusEvent = { status: string; createdAt: string };
type Order = { id: string; status: string; totalAmount: number; paymentMethod: string; createdAt: string };

const TRACKABLE_STATUSES = ORDER_STATUSES.filter((s) => s !== 'cancelled');

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api
      .get<{ order: Order; items: OrderItem[]; events: StatusEvent[] }>(`/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        setItems(res.items);
        setEvents(res.events);
      })
      .catch(() => setError('Order not found.'));
  }, [id]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(`/orders/${id}/track`));
    ws.addEventListener('open', () => setLive(true));
    ws.addEventListener('close', () => setLive(false));
    ws.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data) as { status: string; at: string };
        setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
        setEvents((prev) => (prev.some((ev) => ev.status === data.status) ? prev : [...prev, { status: data.status, createdAt: data.at }]));
      } catch {
        // ignore malformed frames
      }
    });
    return () => ws.close();
  }, [id]);

  async function cancelOrder() {
    setCancelling(true);
    setError(null);
    try {
      await api.patch(`/orders/${id}/status`, { status: 'cancelled' });
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  }

  function confirmCancel() {
    Alert.alert('Cancel this order?', undefined, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, cancel', style: 'destructive', onPress: cancelOrder },
    ]);
  }

  if (error && !order) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">{error}</Text>
      </SafeAreaView>
    );
  }
  if (!order) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  const currentIndex = TRACKABLE_STATUSES.indexOf(order.status as (typeof TRACKABLE_STATUSES)[number]);
  const canCancel = order.status === 'placed' || order.status === 'confirmed';

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <Stack.Screen options={{ title: `Order #${order.id.slice(0, 8)}` }} />
      <ScrollView className="flex-1 px-4" contentContainerClassName="pt-4 pb-8 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className={`text-xs font-medium ${live ? 'text-emerald-600' : 'text-stone-400'}`}>{live ? '● live' : '○ connecting…'}</Text>
        </View>

        {error && <Text className="text-rose-600 text-sm">{error}</Text>}

        {canCancel && (
          <Pressable onPress={confirmCancel} disabled={cancelling}>
            <Text className="text-rose-600 font-medium">{cancelling ? 'Cancelling…' : 'Cancel order'}</Text>
          </Pressable>
        )}

        {order.status === 'cancelled' ? (
          <Text className="text-rose-600 font-medium">This order was cancelled.</Text>
        ) : (
          <Card>
            <View className="flex-row justify-between">
              {TRACKABLE_STATUSES.map((status, i) => (
                <View key={status} className="flex-1 items-center">
                  <View className={`h-3 w-3 rounded-full ${i <= currentIndex ? 'bg-brand-orange-600' : 'bg-stone-200'}`} />
                  <Text className={`mt-1.5 text-[10px] capitalize text-center ${i <= currentIndex ? 'text-brand-orange-700 font-medium' : 'text-stone-400'}`}>
                    {status}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <Card className="p-0 overflow-hidden">
          {items.map((item, i) => (
            <View key={item.id} className={`p-3 flex-row justify-between ${i > 0 ? 'border-t border-stone-100' : ''}`}>
              <Text className="text-stone-700 flex-1 pr-2">
                {item.productName} × {item.quantity}
              </Text>
              <Text className="text-stone-900">₹{item.unitPrice * item.quantity}</Text>
            </View>
          ))}
          <View className="p-3 flex-row justify-between border-t border-stone-100">
            <Text className="font-semibold text-stone-900">Total ({order.paymentMethod.toUpperCase()})</Text>
            <Text className="font-bold text-brand-orange-700">₹{order.totalAmount}</Text>
          </View>
        </Card>

        <View className="gap-1">
          {events.map((ev, i) => (
            <Text key={i} className="text-sm text-stone-500">
              {new Date(ev.createdAt).toLocaleString()} — <Text className="capitalize font-medium text-stone-700">{ev.status}</Text>
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
