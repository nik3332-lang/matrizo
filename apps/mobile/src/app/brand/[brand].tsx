import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PRODUCT_BRANDS, type ProductBrand } from '@matrizo/shared';
import { PressableCard } from '@/components/Card';
import { ProductSwatch } from '@/components/ProductSwatch';
import { api } from '@/lib/api';
import { categoryColor } from '@/lib/categoryColors';

type Tier = { minQty: number; pricePerUnit: number };
type Product = { id: string; slug: string; name: string; unit: string; basePrice: number; categoryId: string; tiers: Tier[] };
type BrandInfo = { brand: ProductBrand; name: string };

export default function BrandScreen() {
  const { brand } = useLocalSearchParams<{ brand: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ brand: BrandInfo; products: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    if (!PRODUCT_BRANDS.includes(brand as ProductBrand)) {
      setError('Unknown brand.');
      return;
    }
    api.get<{ brand: BrandInfo; products: Product[] }>(`/brands/${brand}/products`).then(setData).catch(() => setError('Brand not found.'));
  }, [brand]);

  if (error) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">{error}</Text>
      </SafeAreaView>
    );
  }
  if (!data) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <Stack.Screen options={{ title: data.brand.name }} />
      <FlatList
        data={data.products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerClassName="px-3 pt-3 pb-8"
        columnWrapperClassName="gap-3"
        ListEmptyComponent={<Text className="text-stone-500 px-1">No products from this brand yet.</Text>}
        renderItem={({ item }) => {
          const bestTier = [...item.tiers].sort((a, b) => b.minQty - a.minQty)[0];
          const color = categoryColor(item.categoryId);
          return (
            <View className="flex-1 mb-3">
              <PressableCard onPress={() => router.push(`/product/${item.slug}`)}>
                <ProductSwatch colors={color.gradient} />
                <Text className="font-semibold text-stone-900" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="mt-1 font-bold text-brand-orange-700">₹{item.basePrice}</Text>
                {bestTier && (
                  <Text className="text-[11px] mt-1 self-start px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    ₹{bestTier.pricePerUnit} for {bestTier.minQty}+
                  </Text>
                )}
              </PressableCard>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
