import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { ApiError } from "@matrizo/shared";
import { api, session } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useResource, message } from "@/lib/useResource";
import type { Address } from "@/lib/types";
import { colors, styles as s } from "@/lib/theme";
import { AddressForm } from "@/components/AddressForm";
import {
  Button,
  Empty,
  ErrorState,
  Guest,
  Loading,
  Notice,
  Screen,
  money,
} from "@/components/ui";
type Intent = { checkoutKey: string; addressId: string };
export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const { cart, reload, loading: cartLoading, error: cartError } = useCart();
  const result = useResource<{ addresses: Address[] }>(
    user ? "/account/addresses" : null,
    user?.id,
  );
  const [selected, setSelected] = useState(""),
    [adding, setAdding] = useState(false),
    [pending, setPending] = useState<Intent | null>(null),
    [recovering, setRecovering] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = useRef(false);
  const storageKey = `matrizo.checkout.${user?.id ?? "guest"}`;
  useEffect(() => {
    if (!selected && result.data?.addresses.length)
      setSelected(
        (
          result.data.addresses.find((a) => a.isDefault) ??
          result.data.addresses[0]
        ).id,
      );
  }, [result.data, selected]);
  useEffect(() => {
    let active = true;
    setRecovering(true);
    setPending(null);
    setSelected("");
    setError("");
    (async () => {
      if (!user) return;
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return;
      const intent = JSON.parse(raw) as Intent;
      if (!intent.checkoutKey || !intent.addressId) {
        await AsyncStorage.removeItem(storageKey);
        return;
      }
      if (active) {
        setPending(intent);
        setSelected(intent.addressId);
      }
      const recovered = await api.get<{ orderId: string | null }>(
        `/orders/checkout/${intent.checkoutKey}`,
      );
      if (recovered.orderId && active && session.get()?.user.id === user.id) {
        await AsyncStorage.removeItem(storageKey);
        void reload();
        router.replace({
          pathname: "/orders/[id]",
          params: { id: recovered.orderId },
        });
      }
    })()
      .catch(() => {
        if (active)
          setError(
            "We couldn’t verify your last checkout. Retry below with the same order reference.",
          );
      })
      .finally(() => {
        if (active) setRecovering(false);
      });
    return () => {
      active = false;
    };
  }, [storageKey, user?.id, reload]);
  async function place() {
    if (locked.current || !user || (!selected && !pending)) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const intent = pending ?? {
      checkoutKey: randomUUID(),
      addressId: selected,
    };
    try {
      // Persist before sending. A retry after a lost response or app restart uses the same key.
      await AsyncStorage.setItem(storageKey, JSON.stringify(intent));
      setPending(intent);
      const order = await api.post<{ orderId: string }>("/orders", intent);
      await AsyncStorage.removeItem(storageKey);
      setPending(null);
      if (session.get()?.user.id === user.id) {
        void reload();
        router.replace({
          pathname: "/orders/[id]",
          params: { id: order.orderId },
        });
      }
    } catch (e) {
      // Resolve the key before discarding it, including a 4xx racing another successful request.
      let recovered: { orderId: string | null } | null = null;
      try {
        recovered = await api.get(`/orders/checkout/${intent.checkoutKey}`);
      } catch {
        /* Keep the intent if the outcome is unknown. */
      }
      if (recovered?.orderId && session.get()?.user.id === user.id) {
        await AsyncStorage.removeItem(storageKey);
        setPending(null);
        void reload();
        router.replace({
          pathname: "/orders/[id]",
          params: { id: recovered.orderId },
        });
      } else {
        if (
          e instanceof ApiError &&
          e.status >= 400 &&
          e.status < 500 &&
          recovered
        ) {
          await AsyncStorage.removeItem(storageKey);
          setPending(null);
        }
        setError(
          message(
            e,
            "The connection dropped. Retry checkout to safely check or complete this same order.",
          ),
        );
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (authLoading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user) return <Guest next="/checkout" />;
  return (
    <Screen>
      <Text style={s.eyebrow}>ONE STEP CLOSER TO HOME</Text>
      <Text style={s.title}>Checkout</Text>
      <Notice text={error || cartError} error />
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      {(recovering || result.loading || cartLoading) && <Loading />}
      {pending && (
        <Notice text="You have an unfinished checkout. Retry to recover or complete the same order. Its delivery address is locked until we know the result." />
      )}
      {!recovering && !cartLoading && !cart.items.length && !pending ? (
        <Empty
          title="Your cart is empty"
          detail="Explore the collection to begin your next project."
          action="Browse products"
          onPress={() => router.replace("/search")}
        />
      ) : (
        <>
          <Text style={s.heading}>01 / Delivery address</Text>
          {result.data?.addresses.map((address) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                checked: selected === address.id,
                disabled: busy || !!pending,
              }}
              key={address.id}
              disabled={busy || !!pending}
              onPress={() => setSelected(address.id)}
              style={[
                s.card,
                {
                  borderColor:
                    selected === address.id ? colors.ink : colors.line,
                  borderWidth: selected === address.id ? 2 : 1,
                },
              ]}
            >
              <Text style={s.heading}>
                {selected === address.id ? "● " : "○ "}
                {address.label || address.city}
              </Text>
              <Text style={s.body}>
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                {`\n`}
                {address.city}, {address.state} · {address.pincode}
              </Text>
            </Pressable>
          ))}
          {adding ? (
            <AddressForm
              onCancel={() => setAdding(false)}
              onSaved={(address) => {
                setSelected(address.id);
                setAdding(false);
                void result.reload();
              }}
            />
          ) : (
            <Button
              title="+ Add delivery address"
              secondary
              disabled={busy || !!pending}
              onPress={() => setAdding(true)}
            />
          )}
          <Text style={s.heading}>02 / Your order</Text>
          <View style={s.card}>
            {cart.items.map((item) => (
              <View key={item.id} style={s.between}>
                <Text style={[s.body, { flex: 1 }]}>
                  {item.quantity} × {item.product.name}
                </Text>
                <Text style={s.body}>{money(item.lineTotal)}</Text>
              </View>
            ))}
            <View style={s.divider} />
            <View style={s.between}>
              <Text style={s.heading}>Total</Text>
              <Text style={s.price}>{money(cart.subtotal)}</Text>
            </View>
            <Text style={s.small}>
              We’ll check current prices, stock and delivery coverage when you
              place your order.
            </Text>
          </View>
          <Text style={s.heading}>03 / Payment</Text>
          <View style={s.card}>
            <Text style={s.heading}>Cash on delivery</Text>
            <Text style={s.body}>
              Pay when your order arrives. No payment details are stored in the
              app.
            </Text>
          </View>
          <Button
            title={
              pending
                ? "Retry / recover checkout"
                : `Place order · ${money(cart.subtotal)}`
            }
            busy={busy}
            disabled={
              recovering ||
              (!pending &&
                (!selected || cartLoading || !!cartError || !cart.items.length))
            }
            onPress={place}
          />
        </>
      )}
    </Screen>
  );
}
