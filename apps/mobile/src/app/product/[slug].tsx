import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { Card, PressableCard } from '@/components/Card';
import { categoryIcon, Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { categoryColor } from '@/lib/categoryColors';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };

type Tier = { minQty: number; pricePerUnit: number };
type Category = { id: string; slug: string; name: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  basePrice: number;
  categoryId: string;
  brand: ProductBrand;
  category: Category | null;
  tiers: Tier[];
};

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api
      .get<{ product: Product }>(`/products/${slug}`)
      .then((res) => setProduct(res.product))
      .catch(() => setError('Product not found.'));
  }, [slug]);

  async function addToCart() {
    if (!product) return;
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    setAdding(true);
    setAdded(false);
    try {
      await api.post('/cart/items', { productId: product.id, quantity });
      setAdded(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add to cart.');
    } finally {
      setAdding(false);
    }
  }

  if (error) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">{error}</Text>
      </SafeAreaView>
    );
  }
  if (!product) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream items-center justify-center">
        <Text className="text-stone-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  const unitPrice = priceForQuantity(product.tiers, quantity, product.basePrice);
  const accent = categoryColor(product.categoryId).color;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <Stack.Screen options={{ title: product.name.length > 22 ? product.name.slice(0, 22) + '…' : product.name }} />
      <ScrollView className="flex-1 px-4" contentContainerClassName="pt-4 pb-8 gap-5">
        <View style={{ backgroundColor: accent }} className="h-40 rounded-2xl items-center justify-center">
          <Icon name={categoryIcon(product.category?.slug ?? '')} size={56} color="rgba(255,255,255,0.9)" />
        </View>

        <View>
          <Text className="text-xl font-bold text-stone-900">{product.name}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <Text className="text-xs px-2.5 py-1 rounded-full font-medium bg-brand-orange-100 text-brand-orange-800">
              {BRAND_LABELS[product.brand]}
            </Text>
            <Text className="text-xs text-stone-400">SKU {product.sku}</Text>
          </View>
          {product.description && <Text className="mt-3 text-stone-600">{product.description}</Text>}
        </View>

        <View className="flex-row items-baseline gap-2">
          <Text className="text-2xl font-bold text-brand-orange-700">₹{unitPrice}</Text>
          <Text className="text-sm text-stone-500">/ {product.unit}</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Text className="text-sm font-medium text-stone-700">Quantity</Text>
          <View className="flex-row items-center rounded-lg border border-stone-300">
            <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3.5 py-2">
              <Icon name="minus" size={14} color="#57534e" />
            </Pressable>
            <Text className="w-8 text-center text-stone-900">{quantity}</Text>
            <Pressable onPress={() => setQuantity((q) => q + 1)} className="px-3.5 py-2">
              <Icon name="plus" size={14} color="#57534e" />
            </Pressable>
          </View>
          <Text className="font-bold text-stone-900">₹{unitPrice * quantity} total</Text>
        </View>

        {error && <Text className="text-rose-600 text-sm">{error}</Text>}

        <PressableCard onPress={addToCart} className="bg-brand-orange-600 items-center py-3.5">
          <Text className="text-white font-semibold">{adding ? 'Adding…' : added ? 'Added ✓' : 'Add to cart'}</Text>
        </PressableCard>

        {product.tiers.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <View className="px-4 py-2.5 flex-row justify-between bg-brand-orange-50/60">
              <Text className="font-semibold text-stone-700">Quantity</Text>
              <Text className="font-semibold text-stone-700">Price / {product.unit}</Text>
            </View>
            <View className="px-4 py-2.5 flex-row justify-between border-t border-stone-100">
              <Text className="text-stone-700">1 – {product.tiers[0].minQty - 1}</Text>
              <Text className="text-stone-700">₹{product.basePrice}</Text>
            </View>
            {[...product.tiers]
              .sort((a, b) => a.minQty - b.minQty)
              .map((tier, i, arr) => (
                <View key={tier.minQty} className="px-4 py-2.5 flex-row justify-between border-t border-stone-100">
                  <Text className="text-stone-700">
                    {tier.minQty}
                    {arr[i + 1] ? ` – ${arr[i + 1].minQty - 1}` : '+'}
                  </Text>
                  <Text className="font-medium text-emerald-700">₹{tier.pricePerUnit}</Text>
                </View>
              ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
