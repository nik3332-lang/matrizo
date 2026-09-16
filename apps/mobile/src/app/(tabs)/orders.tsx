import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { statusLabels, dateLabel } from "@/lib/orders";
import type { Order } from "@/lib/types";
import { colors, styles as s } from "@/lib/theme";
import {
  Empty,
  ErrorState,
  Guest,
  Loading,
  Screen,
  money,
} from "@/components/ui";
export default function Orders() {
  const { user, loading } = useAuth();
  const result = useResource<{ orders: Order[] }>(
    user ? "/orders" : null,
    user?.id,
  );
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user) return <Guest next="/orders" title="Every project has a story" />;
  return (
    <Screen refreshing={result.loading} onRefresh={result.reload}>
      <Text style={s.eyebrow}>FROM OUR STORE TO YOUR SPACE</Text>
      <Text style={s.title}>Your orders</Text>
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      {result.loading && !result.data && <Loading />}
      {result.data?.orders.length === 0 && (
        <Empty
          title="Your first project awaits"
          detail="Once you place an order, you can follow every step here."
          action="Explore the collection"
          onPress={() => router.push("/search")}
        />
      )}
      {result.data?.orders.map((order) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Order ${order.id.slice(0, 8)}, ${statusLabels[order.status]}`}
          key={order.id}
          onPress={() =>
            router.push({ pathname: "/orders/[id]", params: { id: order.id } })
          }
          style={s.card}
        >
          <View style={s.between}>
            <Text style={[s.eyebrow, { letterSpacing: 1 }]}>
              {statusLabels[order.status]}
            </Text>
            <Text style={s.heading}>{money(order.totalAmount)}</Text>
          </View>
          <Text style={s.body}>
            Order #{order.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={s.small}>{dateLabel(order.createdAt)}</Text>
          <Text style={[s.link, { color: colors.accent }]}>View order →</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
