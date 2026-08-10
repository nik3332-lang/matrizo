import type { Category, Product } from '@matrizo/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { api } from '../../lib/api';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api
      .getCategories()
      .then((res) => setCategories(res.categories))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .searchProducts(trimmed)
        .then((res) => setSearchResults(res.products))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const isSearching = query.trim().length > 0;

  return (
    <View className="flex-1 bg-cream px-5 pt-6">
      <Text className="text-2xl font-black text-ink">Categories</Text>
      <TextInput
        className="mt-4 rounded-xl border-2 border-purple bg-white px-4 py-3 text-ink"
        placeholder="Search products…"
        value={query}
        onChangeText={setQuery}
      />

      {isSearching ? (
        searching ? (
          <ActivityIndicator className="mt-6" color="#6B21A8" />
        ) : (
          <FlatList
            className="mt-4"
            data={searchResults ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text className="mt-6 text-center text-ink-body">No products found.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/product/${item.id}`)}
                className="mb-3 rounded-xl bg-white p-4"
              >
                <Text className="font-bold text-ink">{item.name}</Text>
                <Text className="mt-1 text-ink-body">
                  ₹{item.basePrice} {item.unit}
                </Text>
              </Pressable>
            )}
          />
        )
      ) : loading ? (
        <ActivityIndicator className="mt-6" color="#6B21A8" />
      ) : (
        <FlatList
          className="mt-4"
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/category/${item.slug}`)}
              className="mb-3 flex-row items-center rounded-xl bg-white p-4"
            >
              <Text className="mr-3 text-2xl">{item.icon}</Text>
              <Text className="font-bold text-ink">{item.name}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
