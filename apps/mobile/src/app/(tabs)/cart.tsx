import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { message } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import {
  Button,
  Empty,
  Guest,
  Loading,
  Notice,
  Screen,
  money,
} from "@/components/ui";
export default function CartScreen() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading, busy, error, reload, change } = useCart();
  const [actionError, setActionError] = useState("");
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  async function update(id: string, quantity: number) {
    setActionError("");
    try {
      await change(id, quantity);
    } catch (e) {
      setActionError(message(e));
    }
  }
  if (authLoading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user)
    return <Guest next="/cart" title="Your next project starts here" />;
  return (
    <Screen
      onRefresh={() => {
        setActionError("");
        void reload();
      }}
      refreshing={loading}
    >
      <Text style={s.eyebrow}>THE GOOD THINGS, ALL TOGETHER</Text>
      <Text style={s.title}>Your cart</Text>
      <Notice text={actionError || error} error />
      {loading && !cart.items.length ? (
        <Loading />
      ) : !cart.items.length ? (
        <Empty
          title="Room for something beautiful"
          detail="Explore our collection and bring your next project to life."
          action="Explore the collection"
          onPress={() => router.push("/search")}
        />
      ) : (
        <>
          {cart.items.map((item) => (
            <View key={item.id} style={s.card}>
              <Text
                style={s.heading}
                onPress={() =>
                  router.push({
                    pathname: "/product/[slug]",
                    params: { slug: item.product.slug },
                  })
                }
              >
                {item.product.name}
              </Text>
              <Text style={s.small}>
                {money(item.unitPrice)} / {item.product.unit}
                {!item.product.active
                  ? " · No longer available — remove to continue"
                  : ""}
              </Text>
              <View style={s.between}>
                <View style={s.row}>
                  <Button
                    title="−"
                    secondary
                    disabled={busy}
                    onPress={() => update(item.product.id, item.quantity - 1)}
                  />
                  <Text style={s.heading}>{item.quantity}</Text>
                  <Button
                    title="+"
                    secondary
                    disabled={busy || item.quantity >= 9999}
                    onPress={() => update(item.product.id, item.quantity + 1)}
                  />
                </View>
                <Text style={s.heading}>{money(item.lineTotal)}</Text>
              </View>
              <Button
                title="Remove item"
                secondary
                disabled={busy}
                onPress={() => update(item.product.id, 0)}
              />
            </View>
          ))}
          <View style={s.card}>
            <View style={s.between}>
              <Text style={s.heading}>Total</Text>
              <Text style={s.price}>{money(cart.subtotal)}</Text>
            </View>
            <Text style={s.small}>
              Cash on delivery. Final price and stock are checked when you place
              your order.
            </Text>
            <Button
              title="Continue to checkout →"
              disabled={
                busy ||
                loading ||
                !!error ||
                cart.items.some((i) => !i.product.active)
              }
              onPress={() => router.push("/checkout")}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
