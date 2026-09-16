import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { BRAND_LABELS, priceForQuantity } from "@matrizo/shared";
import { useResource, message } from "@/lib/useResource";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useLocation, DeliveryArea } from "@/lib/location";
import { styles as s } from "@/lib/theme";
import type { Product } from "@/lib/types";
import { ProductImage } from "@/components/ProductTile";
import {
  Button,
  ErrorState,
  Loading,
  Notice,
  Screen,
  money,
} from "@/components/ui";
export default function ProductDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { area } = useLocation();
  const { user } = useAuth();
  const cart = useCart();
  const result = useResource<{ product: Product }>(
    `/products/${encodeURIComponent(slug ?? "")}${area ? `?pincode=${area.pincode}` : ""}`,
  );
  const [quantity, setQuantity] = useState(1),
    [error, setError] = useState(""),
    [added, setAdded] = useState(false);
  const product = result.data?.product;
  async function add() {
    if (!user) {
      router.push({ pathname: "/login", params: { next: `/product/${slug}` } });
      return;
    }
    if (!product) return;
    setError("");
    setAdded(false);
    try {
      await cart.add(product.id, quantity);
      setAdded(true);
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <Screen onRefresh={result.reload} refreshing={result.loading}>
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      {result.loading && !product && <Loading />}
      {product && (
        <>
          <ProductImage product={product} large />
          <Text style={s.eyebrow}>
            {BRAND_LABELS[product.brand]} /{" "}
            {product.category?.name ?? "THE COLLECTION"}
          </Text>
          <Text style={s.title}>{product.name}</Text>
          <Text style={s.body}>
            {product.description ||
              "A considered addition to your next project. Explore the specifications below."}
          </Text>
          <View style={s.between}>
            <Text style={s.price}>
              {money(
                priceForQuantity(product.tiers, quantity, product.basePrice),
              )}
              <Text style={s.small}> / {product.unit}</Text>
            </Text>
            <Text style={s.small}>SKU {product.sku}</Text>
          </View>
          {product.tiers.length > 0 && (
            <View style={s.card}>
              <Text style={s.eyebrow}>MORE FOR YOUR PROJECT</Text>
              {[...product.tiers]
                .sort((a, b) => a.minQty - b.minQty)
                .map((tier) => (
                  <View key={tier.minQty} style={s.between}>
                    <Text style={s.body}>
                      {tier.minQty}+ {product.unit}
                    </Text>
                    <Text style={s.link}>{money(tier.pricePerUnit)} each</Text>
                  </View>
                ))}
            </View>
          )}
          <DeliveryArea />
          {area?.serviceable && (
            <Notice
              text={
                product.stock
                  ? product.stock.stockQty > 0
                    ? `${product.stock.stockQty} available at ${product.stock.storeName}. Final availability is checked at checkout.`
                    : "Currently out of stock for this delivery area."
                  : "This item is not available in your delivery area."
              }
            />
          )}
          <View style={s.between}>
            <Text style={s.heading}>Quantity</Text>
            <View style={s.row}>
              <Button
                title="−"
                secondary
                disabled={quantity <= 1 || cart.busy}
                onPress={() => {
                  setQuantity((q) => q - 1);
                  setAdded(false);
                }}
              />
              <Text
                accessibilityLabel={`Quantity ${quantity}`}
                style={s.heading}
              >
                {quantity}
              </Text>
              <Button
                title="+"
                secondary
                disabled={
                  quantity >= Math.min(9999, product.stock?.stockQty ?? 9999) ||
                  cart.busy
                }
                onPress={() => {
                  setQuantity((q) => q + 1);
                  setAdded(false);
                }}
              />
            </View>
          </View>
          <Notice text={error} error />
          {added && <Notice text="Added to your cart. Ready when you are." />}
          <Button
            title={
              user
                ? `Add to cart · ${money(priceForQuantity(product.tiers, quantity, product.basePrice) * quantity)}`
                : "Sign in to add to cart"
            }
            busy={cart.busy}
            disabled={
              !!area &&
              (!area.serviceable ||
                !product.stock ||
                product.stock.stockQty < quantity)
            }
            onPress={add}
          />
          {added && (
            <Button
              title="View cart →"
              secondary
              onPress={() => router.push("/cart")}
            />
          )}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <View style={s.card}>
              <Text style={s.heading}>The details</Text>
              {Object.entries(product.specs).map(([key, value]) => (
                <View key={key} style={s.between}>
                  <Text style={[s.body, { flex: 1 }]}>
                    {key.replace(/_/g, " ")}
                  </Text>
                  <Text style={[s.body, { flex: 1, textAlign: "right" }]}>
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
