import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import type { Product } from "@/lib/types";
import { useResource } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import { Empty, ErrorState, Loading } from "./ui";
import { ProductTile } from "./ProductTile";
export function Catalog({
  path,
  title,
  header,
}: {
  path: string;
  title: string;
  header?: ReactNode;
}) {
  const result = useResource<{ products: Product[] }>(path);
  return (
    <SafeAreaView edges={["bottom"]} style={s.page}>
      <FlatList
        data={result.data?.products ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={s.content}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshing={result.loading}
        onRefresh={result.reload}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 20 }}>
            {header}
            <Text style={s.title}>{title}</Text>
            {result.data && (
              <Text style={s.small}>
                {result.data.products.length} products · Selected for your space
              </Text>
            )}
            {!!result.error && (
              <ErrorState error={result.error} retry={result.reload} />
            )}
          </View>
        }
        ListEmptyComponent={
          result.loading ? (
            <Loading />
          ) : !result.error ? (
            <Empty
              title="A little more specific?"
              detail="No products found. Try another search or explore our collections."
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <View
            style={{
              flex: 1,
              maxWidth: "50%",
              marginRight:
                index % 2 === 0 &&
                index === (result.data?.products.length ?? 0) - 1
                  ? 12
                  : 0,
            }}
          >
            <ProductTile product={item} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
