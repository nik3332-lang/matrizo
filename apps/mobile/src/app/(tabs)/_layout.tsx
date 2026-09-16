import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Brand } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { colors } from "@/lib/theme";
const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => (
    <Icon name={name} size={22} color={String(color)} />
  );
export default function TabsLayout() {
  const { cart } = useCart();
  const count = cart.items.reduce((total, item) => total + item.quantity, 0);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitle: () => <Brand />,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: icon("home") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Browse", tabBarIcon: icon("search") }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: icon("cart"),
          tabBarBadge: count ? (count > 99 ? "99+" : count) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", tabBarIcon: icon("receipt") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "You", tabBarIcon: icon("user") }}
      />
    </Tabs>
  );
}
