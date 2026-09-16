import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { BRAND_LABELS } from "@matrizo/shared";
import { Icon } from "./Icon";
import { money } from "./ui";
import { colors, styles as s } from "@/lib/theme";
import type { Product } from "@/lib/types";
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
