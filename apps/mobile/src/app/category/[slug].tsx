import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PRODUCT_BRANDS, type ProductBrand } from '@matrizo/shared';
import { PressableCard } from '@/components/Card';
import { ProductSwatch } from '@/components/ProductSwatch';
import { api } from '@/lib/api';
import { categoryColor } from '@/lib/categoryColors';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };

type Tier = { minQty: number; pricePerUnit: number };
type Product = { id: string; slug: string; name: string; unit: string; basePrice: number; brand: ProductBrand; tiers: Tier[] };
type Category = { id: string; slug: string; name: string };

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ category: Category; products: Product[] } | null>(null);
  const [brandFilter, setBrandFilter] = useState<ProductBrand | 'all'>('all');

  useEffect(() => {
    setData(null);
    setBrandFilter('all');
    api.get<{ category: Category; products: Product[] }>(`/categories/${slug}/products`).then(setData);
  }, [slug]);

  if (!data) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  const accent = categoryColor(data.category.id).color;
  const brandsPresent = PRODUCT_BRANDS.filter((b) => data.products.some((p) => p.brand === b));
  const visible = brandFilter === 'all' ? data.products : data.products.filter((p) => p.brand === brandFilter);

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <Stack.Screen options={{ title: data.category.name }} />
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerClassName="px-3 pt-3 pb-8"
        columnWrapperClassName="gap-3"
        ListHeaderComponent={
          brandsPresent.length > 1 ? (
            <View className="flex-row flex-wrap gap-2 px-1 mb-3">
              <Pressable
                onPress={() => setBrandFilter('all')}
                className={`px-3 py-1.5 rounded-full ${brandFilter === 'all' ? 'bg-stone-900' : 'bg-white'}`}
              >
                <Text className={`text-xs font-medium ${brandFilter === 'all' ? 'text-white' : 'text-stone-600'}`}>All brands</Text>
              </Pressable>
              {brandsPresent.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setBrandFilter(b)}
                  className={`px-3 py-1.5 rounded-full ${brandFilter === b ? 'bg-brand-orange-600' : 'bg-white'}`}
                >
                  <Text className={`text-xs font-medium ${brandFilter === b ? 'text-white' : 'text-stone-600'}`}>{BRAND_LABELS[b]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={<Text className="text-stone-500 px-1">No products in this category yet.</Text>}
        renderItem={({ item }) => {
          const bestTier = [...item.tiers].sort((a, b) => b.minQty - a.minQty)[0];
          return (
            <View className="flex-1 mb-3">
              <PressableCard onPress={() => router.push(`/product/${item.slug}`)}>
                <ProductSwatch color={accent} categorySlug={slug} />
                <Text className="font-semibold text-stone-900" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="text-[11px] text-brand-orange-700 bg-brand-orange-50 self-start px-2 py-0.5 rounded-full mt-1">
                  {BRAND_LABELS[item.brand]}
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
