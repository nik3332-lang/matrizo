import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { BRAND_LABELS } from "@matrizo/shared";
import { Icon } from "./Icon";
import { money } from "./ui";
import { colors, styles as s } from "@/lib/theme";
import type { Product } from "@/lib/types";
import { useLocation } from "@/lib/location";
import { useResource } from "@/lib/useResource";
export function ProductImage({
  product,
  large = false,
}: {
  product: Product;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={{
        backgroundColor: colors.soft,
        height: large ? 300 : 156,
        borderRadius: 13,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {product.imageUrl && !failed ? (
        <Image
          source={{ uri: product.imageUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          onError={() => setFailed(true)}
          accessibilityLabel={product.name}
        />
      ) : (
        <Icon name="package" size={large ? 76 : 45} color={colors.accent} />
      )}
    </View>
  );
}
export function ProductTile({ product }: { product: Product }) {
  const { area } = useLocation();
  const availability = useResource<{ stock: { available: boolean } | null }>(
    area
      ? `/products/${encodeURIComponent(product.slug)}/stock?pincode=${area.pincode}`
      : null,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${money(product.basePrice)}, view product`}
      onPress={() =>
        router.push({
          pathname: "/product/[slug]",
          params: { slug: product.slug },
        })
      }
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 18,
        padding: 10,
        gap: 9,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <ProductImage product={product} />
      <CategoryBadge category={product.category} />
      {area && availability.data && !availability.data.stock?.available && (
        <Text style={s.small}>Unavailable</Text>
      )}
      <Text style={[s.eyebrow, { fontSize: 9, letterSpacing: 1 }]}>
        {BRAND_LABELS[product.brand]}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          color: colors.ink,
          fontWeight: "600",
          fontSize: 14,
          minHeight: 38,
          lineHeight: 19,
        }}
      >
        {product.name}
      </Text>
      <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 17 }}>
        {money(product.basePrice)}
        <Text style={s.small}> / {product.unit}</Text>
      </Text>
      <Text style={[s.small, { color: colors.accent }]}>View details →</Text>
    </Pressable>
  );
}
export function CategoryBadge({
  category,
}: {
  category?: Product["category"];
}) {
  if (!category?.colour) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: "#999",
          backgroundColor: category.colour,
        }}
      />
      <Text style={[s.small, { flexShrink: 1 }]}>{category.name}</Text>
    </View>
  );
}
