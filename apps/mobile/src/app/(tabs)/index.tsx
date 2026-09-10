import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { priceForQuantity, type ProductBrand } from '@matrizo/shared';
import { Card, PressableCard } from '@/components/Card';
import { Icon, categoryIcon } from '@/components/Icon';
import { ProductSwatch } from '@/components/ProductSwatch';
import { api } from '@/lib/api';
import { categoryColor } from '@/lib/categoryColors';

const BRAND_COLOR: Record<ProductBrand, string> = {
  raksha: '#4e1775',
  prince: '#ef3d21',
  others: '#78716c',
};

type Category = { id: string; slug: string; name: string };
type Brand = { brand: ProductBrand; name: string; productCount: number };
type Tier = { minQty: number; pricePerUnit: number };
type Product = { id: string; slug: string; name: string; unit: string; basePrice: number; categoryId: string; tiers: Tier[] };
type Serviceability = { pincode: string; serviceable: boolean; etaMinutes: number | null };

const FEATURES = [
  { icon: 'truck', title: 'Fast delivery', body: 'Under an hour, from your nearest dark store.' },
  { icon: 'badgeCheck', title: 'Genuine products', body: 'Trusted brands, real specs.' },
  { icon: 'package', title: 'Bulk pricing', body: 'Order more, pay less.' },
  { icon: 'cash', title: 'Pay on delivery', body: 'No payment details needed upfront.' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [popular, setPopular] = useState<Product[] | null>(null);
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Serviceability | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then(async (res) => {
      setCategories(res.categories);
      const perCategory = await Promise.all(
        res.categories.map((cat) =>
          api
            .get<{ products: Product[] }>(`/categories/${cat.slug}/products`)
            .then((r) => r.products)
            .catch(() => [])
        )
      );
      setPopular(perCategory.flat().slice(0, 8));
    });
    api.get<{ brands: Brand[] }>('/brands').then((res) => setBrands(res.brands));
  }, []);

  async function checkPincode() {
    if (!pincode.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await api.get<Serviceability>(`/serviceability/${encodeURIComponent(pincode.trim())}`);
      setResult(res);
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-brand-cream">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8 gap-6">
        <View className="mt-4 rounded-2xl p-5 bg-brand-purple-800">
          <Text className="text-2xl font-bold text-white">Sanitary & paints — delivered fast.</Text>
          <Text className="mt-1 text-white/90">Check if we deliver to your pincode.</Text>
          <View className="mt-4 flex-row gap-2">
            <View className="flex-1 flex-row items-center bg-white rounded-lg px-3">
              <Icon name="mapPin" size={16} color="#a8a29e" />
              <TextInput
                value={pincode}
                onChangeText={setPincode}
                placeholder="Enter pincode"
                keyboardType="number-pad"
                className="flex-1 py-2.5 px-2 text-stone-900"
              />
            </View>
            <PressableCard onPress={checkPincode} className="px-4 py-2.5 rounded-lg justify-center">
              <Text className="font-semibold text-brand-orange-700">{checking ? 'Checking…' : 'Check'}</Text>
            </PressableCard>
          </View>
          {result && (
            <Text className={`mt-3 font-medium ${result.serviceable ? 'text-emerald-100' : 'text-white/80'}`}>
              {result.serviceable ? `✓ We deliver here — ETA ~${result.etaMinutes} min.` : 'Not serviceable at this pincode yet.'}
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap -mx-1.5">
          {FEATURES.map((f) => (
            <View key={f.title} className="w-1/2 px-1.5 mb-3">
              <Card className="items-center">
                <View className="h-10 w-10 rounded-full bg-brand-orange-50 items-center justify-center">
                  <Icon name={f.icon} size={20} color="#ef3d21" />
                </View>
                <Text className="mt-2 font-semibold text-stone-900 text-sm text-center">{f.title}</Text>
                <Text className="mt-1 text-xs text-stone-500 text-center">{f.body}</Text>
              </Card>
            </View>
          ))}
        </View>

        <View>
          <Text className="text-lg font-semibold text-stone-900 mb-3">Shop by category</Text>
          <View className="flex-row flex-wrap -mx-1.5">
            {categories?.map((cat) => {
              const color = categoryColor(cat.id);
              return (
                <View key={cat.id} className="w-1/3 px-1.5 mb-3">
                  <PressableCard onPress={() => router.push(`/category/${cat.slug}`)} className="items-center">
                    <View style={{ backgroundColor: color.color }} className="h-12 w-12 rounded-full items-center justify-center">
                      <Icon name={categoryIcon(cat.slug)} size={22} color="#fff" />
                    </View>
                    <Text className="mt-2 font-semibold text-stone-900 text-center text-xs">{cat.name}</Text>
                  </PressableCard>
                </View>
              );
            })}
          </View>
        </View>

        <View>
          <Text className="text-lg font-semibold text-stone-900 mb-3">Shop by brand</Text>
          <View className="flex-row flex-wrap -mx-1.5">
            {brands
              ?.filter((b) => b.productCount > 0)
              .map((b) => (
                <View key={b.brand} className="w-1/3 px-1.5 mb-3">
                  <PressableCard onPress={() => router.push(`/brand/${b.brand}`)} className="items-center">
                    <View style={{ backgroundColor: BRAND_COLOR[b.brand] }} className="h-10 w-10 rounded-full items-center justify-center">
                      <Text className="text-white font-bold">{b.name[0]}</Text>
                    </View>
                    <Text className="mt-2 font-semibold text-stone-900 text-xs">{b.name}</Text>
                    <Text className="text-[11px] text-stone-500">{b.productCount} products</Text>
                  </PressableCard>
                </View>
              ))}
          </View>
        </View>

        {popular && popular.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-stone-900 mb-3">Popular right now</Text>
            <View className="flex-row flex-wrap -mx-1.5">
              {popular.map((product) => {
                const price = priceForQuantity(product.tiers, 1, product.basePrice);
                const color = categoryColor(product.categoryId);
                return (
                  <View key={product.id} className="w-1/2 px-1.5 mb-3">
                    <PressableCard onPress={() => router.push(`/product/${product.slug}`)}>
                      <ProductSwatch color={color.color} />
                      <Text className="font-medium text-sm text-stone-900" numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text className="text-xs text-stone-500 mt-1">per {product.unit}</Text>
                      <Text className="mt-1 font-bold text-brand-orange-700">₹{price}</Text>
                    </PressableCard>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
