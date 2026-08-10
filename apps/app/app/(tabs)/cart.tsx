import { View, Text } from 'react-native';

export default function CartScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-cream px-8">
      <Text className="text-2xl font-black text-ink">Cart</Text>
      <Text className="mt-2 text-center text-ink-body">
        Cart & checkout land in Phase 3, once catalog (Phase 1) and login (Phase 2) are in place.
      </Text>
    </View>
  );
}
