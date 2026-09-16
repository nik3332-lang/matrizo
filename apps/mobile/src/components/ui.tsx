import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, styles as s } from "@/lib/theme";
import { Icon } from "./Icon";
export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView edges={["bottom"]} style={s.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.ink}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  busy,
  disabled,
  secondary,
  danger,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  const backgroundColor = secondary
    ? colors.soft
    : danger
      ? colors.danger
      : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 13,
        backgroundColor,
        opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
      })}
    >
      {busy && (
        <ActivityIndicator
          size="small"
          color={secondary ? colors.ink : colors.white}
        />
      )}
      <Text
        style={{
          color: secondary ? colors.ink : colors.white,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.ink, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        {...props}
        style={[
          {
            color: colors.ink,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.line,
            minHeight: 50,
            borderRadius: 12,
            padding: 14,
            fontSize: 15,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text?: string | null;
  error?: boolean;
}) {
  if (!text) return null;
  return (
    <Text
      accessibilityRole="alert"
      style={[
        s.body,
        {
          padding: 14,
          borderRadius: 12,
          backgroundColor: error ? "#fff0ef" : colors.soft,
          color: error ? colors.danger : colors.ink,
        },
      ]}
    >
      {text}
    </Text>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 40 }}>
      <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" />
    </View>
  );
}
export function Empty({
  title,
  detail,
  action,
  onPress,
}: {
  title: string;
  detail: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={[s.card, { paddingVertical: 30, gap: 16 }]}>
      <Icon name="package" size={32} color={colors.accent} />
      <Text style={s.heading}>{title}</Text>
      <Text style={s.body}>{detail}</Text>
      {action && onPress && <Button title={action} onPress={onPress} />}
    </View>
  );
}
export function Guest({
  next = "/account",
  title = "Make yourself at home",
}: {
  next?: string;
  title?: string;
}) {
  return (
    <Screen>
      <Empty
        title={title}
        detail="Sign in to save your cart for checkout, manage addresses, and follow your orders."
        action="Sign in / Create account"
        onPress={() => router.push({ pathname: "/login", params: { next } })}
      />
    </Screen>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Notice text={error} error />
      <Button title="Try again" secondary onPress={retry} />
    </View>
  );
}
export function Brand() {
  return (
    <Text
      accessibilityLabel="Matrizo"
      style={{
        color: colors.ink,
        fontSize: 23,
        letterSpacing: 4,
        fontWeight: "600",
      }}
    >
      MATRIZO<Text style={{ color: colors.accent }}>.</Text>
    </Text>
  );
}
export { formatMoney as money } from "@matrizo/shared";
