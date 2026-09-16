import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { LocationProvider } from "@/lib/location";
import { NotificationBridge } from "@/components/NotificationBridge";
import { colors } from "@/lib/theme";
export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.ink,
              headerTitleStyle: { fontWeight: "600" },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
              headerBackButtonDisplayMode: "minimal",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="category/[slug]"
              options={{ title: "Collection" }}
            />
            <Stack.Screen
              name="brand/[brand]"
              options={{ title: "Our brands" }}
            />
            <Stack.Screen
              name="product/[slug]"
              options={{ title: "The details" }}
            />
            <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
            <Stack.Screen
              name="orders/[id]"
              options={{ title: "Your order" }}
            />
            <Stack.Screen
              name="login"
              options={{ title: "Welcome", presentation: "modal" }}
            />
            <Stack.Screen
              name="forgot-password"
              options={{ title: "Account recovery" }}
            />
            <Stack.Screen
              name="addresses"
              options={{ title: "Delivery addresses" }}
            />
            <Stack.Screen
              name="delete-account"
              options={{ title: "Account deletion" }}
            />
            <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
            <Stack.Screen
              name="support"
              options={{ title: "Help & support" }}
            />
          </Stack>
          <NotificationBridge />
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
