import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuthStore } from '../../stores/auth';

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-cream px-8">
        <Text className="text-2xl font-black text-ink">Account</Text>
        <Text className="mt-2 text-center text-ink-body">
          Log in to see your profile, addresses, and order history.
        </Text>
        <Pressable onPress={() => router.push('/login')} className="mt-6 rounded-xl bg-purple px-6 py-3">
          <Text className="font-extrabold text-white">Log In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream px-6 pt-8">
      <Text className="text-2xl font-black text-ink">{user.name ?? 'Welcome'}</Text>
      <Text className="mt-1 text-ink-body">+91 {user.phone}</Text>

      <Pressable
        onPress={() => router.push('/orders')}
        className="mt-8 rounded-xl border-2 border-purple bg-white px-4 py-4"
      >
        <Text className="font-extrabold text-purple">My Orders</Text>
      </Pressable>

      <Pressable onPress={() => logout()} className="mt-4 rounded-xl bg-orange px-4 py-4">
        <Text className="text-center font-extrabold text-white">Log Out</Text>
      </Pressable>
    </View>
  );
}
