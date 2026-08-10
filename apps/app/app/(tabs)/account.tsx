import { View, Text } from 'react-native';

export default function AccountScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-cream px-8">
      <Text className="text-2xl font-black text-ink">Account</Text>
      <Text className="mt-2 text-center text-ink-body">
        Phone + OTP login lands in Phase 2. Once signed in, order history and profile will live
        here.
      </Text>
    </View>
  );
}
