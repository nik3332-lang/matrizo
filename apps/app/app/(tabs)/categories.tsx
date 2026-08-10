import { View, Text } from 'react-native';

export default function CategoriesScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-cream px-8">
      <Text className="text-2xl font-black text-ink">Categories</Text>
      <Text className="mt-2 text-center text-ink-body">
        Product catalog browsing lands in Phase 1 — categories, listings, search, and product
        detail pages.
      </Text>
    </View>
  );
}
