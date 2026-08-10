import { ApiError, type BulkPricingTier, priceForQuantity, type Product } from '@matrizo/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [product, setProduct] = useState<Product | null>(null);
  const [tiers, setTiers] = useState<BulkPricingTier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((res) => {
        setProduct(res.product);
        setTiers(res.bulkPricingTiers);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const unitPrice = useMemo(
    () => (product ? priceForQuantity(tiers, quantity, product.basePrice) : 0),
    [product, tiers, quantity]
  );

  async function handleAddToCart() {
    if (!product) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      await api.addToCart(product.id, quantity);
      setMessage('Added to cart!');
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator color="#6B21A8" />
      </View>
    );
  }
  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-cream px-8">
        <Text className="text-ink-body">Product not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream px-5 pt-4">
      <Stack.Screen options={{ title: product.name }} />

      <Text className="text-xl font-black text-ink">{product.name}</Text>
      {product.description ? <Text className="mt-2 text-ink-body">{product.description}</Text> : null}

      <View className="mt-4 rounded-xl bg-white p-4">
        <Text className="text-2xl font-black text-purple">
          ₹{unitPrice} <Text className="text-sm font-semibold text-ink-body">{product.unit}</Text>
        </Text>
        {quantity > 1 ? (
          <Text className="mt-1 text-sm text-ink-body">
            ₹{unitPrice * quantity} total for {quantity}
          </Text>
        ) : null}
      </View>

      {tiers.length > 0 ? (
        <View className="mt-4 rounded-xl bg-white p-4">
          <Text className="mb-2 font-extrabold text-ink">Bulk Pricing</Text>
          {tiers.map((tier) => (
            <View key={tier.id} className="flex-row justify-between py-1">
              <Text className="text-ink-body">{tier.minQty}+ units</Text>
              <Text className="font-bold text-ink">
                ₹{tier.pricePerUnit} {product.unit}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-6 flex-row items-center justify-center gap-6">
        <Pressable
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-xl font-extrabold text-purple">−</Text>
        </Pressable>
        <Text className="text-xl font-extrabold text-ink">{quantity}</Text>
        <Pressable
          onPress={() => setQuantity((q) => q + 1)}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-xl font-extrabold text-purple">+</Text>
        </Pressable>
      </View>

      {message ? <Text className="mt-4 text-center font-semibold text-purple">{message}</Text> : null}

      <Pressable
        disabled={adding}
        onPress={handleAddToCart}
        className={`my-6 items-center rounded-xl bg-purple py-4 ${adding ? 'opacity-50' : ''}`}
      >
        {adding ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-extrabold text-white">
            {user ? 'Add to Cart' : 'Log in to Add to Cart'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
