import type { Category, Product } from '@matrizo/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { api } from '../../lib/api';

export default function CategoryProductsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .getCategoryProducts(slug)
      .then((res) => {
        setCategory(res.category);
        setProducts(res.products);
      })
      .catch(() => setError('Could not load this category'))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <View className="flex-1 bg-cream px-5 pt-4">
      <Stack.Screen options={{ title: category?.name ?? 'Category' }} />
      {loading ? (
        <ActivityIndicator className="mt-8" color="#6B21A8" />
      ) : error ? (
        <Text className="mt-8 text-center text-ink-body">{error}</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text className="mt-8 text-center text-ink-body">No products in this category yet.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/product/${item.id}`)}
              className="mb-3 rounded-xl bg-white p-4"
            >
              <Text className="font-bold text-ink">{item.name}</Text>
              {item.description ? (
                <Text className="mt-1 text-sm text-ink-body">{item.description}</Text>
              ) : null}
              <Text className="mt-2 font-extrabold text-purple">
                ₹{item.basePrice} {item.unit}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
