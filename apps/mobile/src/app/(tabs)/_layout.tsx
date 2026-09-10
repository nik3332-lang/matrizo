import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';

const ACTIVE = '#ef3d21';
const INACTIVE = '#a8a29e';

function TabIcon(name: IconName) {
  return ({ color }: { color: ColorValue }) => <Icon name={name} size={22} color={String(color)} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#fdf3f0' },
        headerTitleStyle: { color: '#1c1917', fontWeight: '700' },
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Matrizo', tabBarLabel: 'Home', tabBarIcon: TabIcon('home') }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: TabIcon('search') }} />
      <Tabs.Screen name="cart" options={{ title: 'Your cart', tabBarIcon: TabIcon('cart') }} />
      <Tabs.Screen name="orders" options={{ title: 'Your orders', tabBarIcon: TabIcon('receipt') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: TabIcon('user') }} />
    </Tabs>
  );
}
