import '../global.css';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '../stores/auth';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate().finally(() => setReady(true));
  }, [hydrate]);

  if (!ready || !hydrated) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: true, title: 'Sign in' }} />
        <Stack.Screen name="category/[slug]" options={{ headerShown: true, title: 'Category' }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: true, title: 'Product' }} />
        <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Checkout' }} />
        <Stack.Screen name="orders" options={{ headerShown: true, title: 'My Orders' }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: true, title: 'Order' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
