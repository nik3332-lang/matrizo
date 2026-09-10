import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { PressableCard } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ProductSwatch } from '@/components/ProductSwatch';
import { api } from '@/lib/api';
import { categoryColor } from '@/lib/categoryColors';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };

type Tier = { minQty: number; pricePerUnit: number };
type Product = { id: string; slug: string; name: string; unit: string; basePrice: number; categoryId: string; brand: ProductBrand; tiers: Tier[] };

export default function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[] | null>(null);
  let debounce: ReturnType<typeof setTimeout>;

  function onChangeQuery(text: string) {
    setQ(text);
    clearTimeout(debounce);
    if (!text.trim()) {
      setResults(null);
      return;
    }
    debounce = setTimeout(() => {
      api.get<{ products: Product[] }>(`/products/search?q=${encodeURIComponent(text.trim())}`).then((res) => setResults(res.products));
    }, 350);
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <View className="px-4 pt-3">
        <View className="flex-row items-center bg-white rounded-full px-3 shadow-sm shadow-black/10">
          <Icon name="search" size={16} color="#a8a29e" />
          <TextInput
            value={q}
            onChangeText={onChangeQuery}
            placeholder="Search products…"
            className="flex-1 py-2.5 px-2 text-stone-900"
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={results ?? []}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerClassName="px-3 pt-3 pb-8"
        columnWrapperClassName="gap-3"
        ListEmptyComponent={
          <Text className="text-stone-500 text-center mt-8 px-4">
            {!q.trim() ? 'Search for pipes, fittings, paints…' : results === null ? 'Searching…' : 'No products matched.'}
          </Text>
        }
        renderItem={({ item }) => {
          const price = priceForQuantity(item.tiers, 1, item.basePrice);
          const color = categoryColor(item.categoryId);
          return (
            <View className="flex-1 mb-3">
              <PressableCard onPress={() => router.push(`/product/${item.slug}`)}>
                <ProductSwatch colors={color.gradient} />
                <Text className="font-medium text-stone-900" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="text-[11px] text-brand-orange-700 bg-brand-orange-50 self-start px-2 py-0.5 rounded-full mt-1">
                  {BRAND_LABELS[item.brand]}
                </Text>
                <Text className="text-xs text-stone-500 mt-1">per {item.unit}</Text>
                <Text className="mt-1 font-bold text-brand-orange-700">₹{price}</Text>
              </PressableCard>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
