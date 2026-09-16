import { useCallback, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource, message } from "@/lib/useResource";
import { statusLabels, dateLabel } from "@/lib/orders";
import type { OrderDetail } from "@/lib/types";
import { colors, styles as s } from "@/lib/theme";
import {
  Button,
  ErrorState,
  Guest,
  Loading,
  Notice,
  Screen,
  money,
} from "@/components/ui";
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading } = useAuth();
  const result = useResource<OrderDetail>(
    user ? `/orders/${encodeURIComponent(id ?? "")}` : null,
    user?.id,
  );
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const status = result.data?.order.status;
  useFocusEffect(
    useCallback(() => {
      if (!user || status === "delivered" || status === "cancelled") return;
      let fetching = false;
      const refresh = async () => {
        if (AppState.currentState !== "active" || fetching) return;
        fetching = true;
        await result.reload();
        fetching = false;
      };
      const timer = setInterval(() => {
        void refresh();
      }, 15000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [user?.id, status, result.reload]),
  );
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/orders/${id}/status`, { status: "cancelled" });
      setConfirm(false);
      await result.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user) return <Guest next={`/orders/${id}`} />;
  const data = result.data;
  return (
    <Screen refreshing={result.loading} onRefresh={result.reload}>
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      {result.loading && !data && <Loading />}
      {data && (
        <>
          <Text style={s.eyebrow}>
            ORDER #{data.order.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={s.title}>{statusLabels[data.order.status]}</Text>
          <Text style={s.body}>
            {data.order.status === "delivered"
              ? "A little closer to your perfect space. Thank you for choosing Matrizo."
              : data.order.status === "cancelled"
                ? "This order has been cancelled."
                : "We’ll keep this page updated as your order moves from our store to your door."}
          </Text>
          <View style={s.card}>
            {data.events.map((event) => (
              <View key={event.id} style={[s.row, { paddingVertical: 8 }]}>
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: colors.accent,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: "600" }}>
                    {statusLabels[event.status]}
                  </Text>
                  <Text style={s.small}>{dateLabel(event.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.heading}>Your order</Text>
            {data.items.map((item) => (
              <View key={item.id} style={s.between}>
                <Text style={[s.body, { flex: 1 }]}>
                  {item.quantity} × {item.productName}
                </Text>
                <Text style={s.body}>
                  {money(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}
            <View style={s.divider} />
            <View style={s.between}>
              <Text style={s.heading}>Total</Text>
              <Text style={s.price}>{money(data.order.totalAmount)}</Text>
            </View>
            <Text style={s.small}>
              Cash on delivery ·{" "}
              {data.order.paymentStatus === "paid"
                ? "Paid"
                : data.order.status === "cancelled"
                  ? "Cancelled"
                  : "Payment pending"}
            </Text>
          </View>
          {data.address && (
            <View style={s.card}>
              <Text style={s.heading}>Delivery address</Text>
              <Text style={s.body}>
                {data.address.line1}
                {data.address.line2 ? `, ${data.address.line2}` : ""}
                {`\n`}
                {data.address.city}, {data.address.state} ·{" "}
                {data.address.pincode}
              </Text>
              {data.delivery?.partnerName && (
                <Text style={s.body}>
                  Delivery partner: {data.delivery.partnerName}
                </Text>
              )}
            </View>
          )}
          <Notice text={error} error />
          {(status === "placed" || status === "confirmed") &&
            (confirm ? (
              <View style={s.card}>
                <Text style={s.heading}>Cancel this order?</Text>
                <Text style={s.body}>
                  This will release the reserved stock and cannot be undone.
                </Text>
                <Button
                  title="Yes, cancel order"
                  danger
                  busy={busy}
                  onPress={cancel}
                />
                <Button
                  title="Keep my order"
                  secondary
                  disabled={busy}
                  onPress={() => setConfirm(false)}
                />
              </View>
            ) : (
              <Button
                title="Cancel order"
                secondary
                onPress={() => setConfirm(true)}
              />
            ))}
        </>
      )}
    </Screen>
  );
}
