import { ImageBackground, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useResource } from "@/lib/useResource";
import type { Category, Product } from "@/lib/types";
import { colors, styles as s } from "@/lib/theme";
import { DeliveryArea } from "@/lib/location";
import { Button, ErrorState, Loading, Screen } from "@/components/ui";
import { ProductTile, CategoryBadge } from "@/components/ProductTile";
import { Icon, categoryIcon } from "@/components/Icon";
type Storefront = {
  categories: Category[];
  featured: Product[];
  brands: { brand: string; name: string; productCount: number }[];
};
export default function Home() {
  const result = useResource<Storefront>("/storefront");
  return (
    <Screen onRefresh={result.reload} refreshing={result.loading}>
      <View style={s.between}>
        <Text style={s.eyebrow}>THE ART OF EVERYDAY LIVING</Text>
        <Icon name="badgeCheck" color={colors.accent} size={20} />
      </View>
      <ImageBackground
        source={require("@/assets/brand/bathroom-editorial.webp")}
        resizeMode="cover"
        imageStyle={{ borderRadius: 22 }}
        style={{
          minHeight: 355,
          justifyContent: "flex-end",
          overflow: "hidden",
          borderRadius: 22,
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(15,37,47,0.72)",
            padding: 24,
            gap: 13,
          }}
        >
          <Text style={[s.eyebrow, { color: "#dce9e8" }]}>
            CONSIDERED SPACES. LASTING QUALITY.
          </Text>
          <Text
            style={[
              s.title,
              { color: colors.white, fontSize: 34, lineHeight: 39 },
            ]}
          >
            A better home{`\n`}begins here.
          </Text>
          <Text style={[s.body, { color: "#e4eaeb" }]}>
            Sanitary ware, bathroom fittings & paints — chosen with care,
            delivered to your door.
          </Text>
          <Button
            title="Explore the collection →"
            secondary
            onPress={() => router.push("/search")}
          />
        </View>
      </ImageBackground>
      <DeliveryArea />
      <Button
        title="Painters"
        secondary
        onPress={() =>
          router.push({
            pathname: "/professionals/[kind]",
            params: { kind: "painter" },
          })
        }
      />
      <Button
        title="Plumbers"
        secondary
        onPress={() =>
          router.push({
            pathname: "/professionals/[kind]",
            params: { kind: "plumber" },
          })
        }
      />
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      {result.loading && !result.data && <Loading />}
      {result.data && (
        <>
          <View style={{ gap: 15 }}>
            <Text style={s.eyebrow}>FIND YOUR FINISH</Text>
            <Text style={s.heading}>Shop by collection</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {result.data.categories
                .filter((c) => !c.parentId)
                .map((category) => (
                  <Pressable
                    accessibilityRole="button"
                    key={category.id}
                    onPress={() =>
                      router.push({
                        pathname: "/category/[slug]",
                        params: { slug: category.slug, name: category.name },
                      })
                    }
                    style={[
                      s.card,
                      {
                        width: "48%",
                        flexGrow: 1,
                        backgroundColor: colors.sage,
                        borderWidth: 0,
                        minHeight: 115,
                      },
                    ]}
                  >
                    <Icon
                      name={categoryIcon(category.slug)}
                      color={colors.ink}
                      size={27}
                    />
                    <Text
                      style={{
                        color: colors.ink,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {category.colour ? "" : `${category.name} →`}
                    </Text>
                    <CategoryBadge category={category} />
                  </Pressable>
                ))}
            </View>
          </View>
          <View style={{ gap: 15 }}>
            <Text style={s.eyebrow}>THE MATRIZO EDIT</Text>
            <View style={s.between}>
              <Text style={s.heading}>Made for your space</Text>
              <Pressable
                onPress={() => router.push("/search")}
                accessibilityRole="button"
              >
                <Text style={s.link}>View all →</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {result.data.featured.slice(0, 8).map((product) => (
                <View key={product.id} style={{ width: "48%", flexGrow: 1 }}>
                  <ProductTile product={product} />
                </View>
              ))}
            </View>
          </View>
          <View style={[s.card, { backgroundColor: colors.sand }]}>
            <Text style={s.eyebrow}>NAMES YOU KNOW. QUALITY YOU TRUST.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {result.data.brands.map((brand) => (
                <Pressable
                  key={brand.brand}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/brand/[brand]",
                      params: { brand: brand.brand },
                    })
                  }
                  style={{
                    borderColor: colors.line,
                    borderWidth: 1,
                    borderRadius: 30,
                    backgroundColor: colors.white,
                    paddingHorizontal: 17,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ color: colors.ink, fontWeight: "600" }}>
                    {brand.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
      <View style={{ paddingVertical: 10, gap: 6 }}>
        <Text style={s.heading}>Build something beautiful.</Text>
        <Text style={s.body}>From the first coat to the final fitting.</Text>
      </View>
    </Screen>
  );
}
