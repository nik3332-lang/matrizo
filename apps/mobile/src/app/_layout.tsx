import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/lib/auth';
import '../global.css';

const HEADER_TINT = '#ef3d21';
const HEADER_BG = '#fdf3f0';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: HEADER_BG },
          headerTintColor: HEADER_TINT,
          headerTitleStyle: { color: '#1c1917', fontWeight: '700' },
          contentStyle: { backgroundColor: '#f4eae0' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="category/[slug]" options={{ title: '' }} />
        <Stack.Screen name="brand/[brand]" options={{ title: '' }} />
        <Stack.Screen name="product/[slug]" options={{ title: '' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
        <Stack.Screen name="login" options={{ title: 'Log in', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
