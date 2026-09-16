import { useState } from "react";
import { Text, View } from "react-native";
import { Link, useLocalSearchParams, router, type Href } from "expo-router";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CustomerSession } from "@/lib/session-core";
import { safeDestination } from "@/lib/navigation";
import { message } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import { Brand, Button, Field, Notice, Screen } from "@/components/ui";
export default function Login() {
  const { login } = useAuth();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [signup, setSignup] = useState(false),
    [identifier, setIdentifier] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [name, setName] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const result = await authApi.post<CustomerSession>(
        signup ? "/auth/customer-register" : "/auth/customer-login",
        signup
          ? {
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              password,
            }
          : { identifier: identifier.trim(), password },
      );
      await login(result);
      setPassword("");
      router.replace(safeDestination(next) as Href);
    } catch (e) {
      setError(
        message(
          e,
          e instanceof Error
            ? e.message
            : "We couldn’t sign you in. Try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Brand />
      <Text style={s.eyebrow}>YOUR SPACE. BEAUTIFULLY MADE.</Text>
      <Text style={s.title}>
        {signup ? "Welcome to Matrizo" : "Good to see you again"}
      </Text>
      <Text style={s.body}>
        Thoughtful finishes, trusted essentials. Everything for your next
        project, in one place.
      </Text>
      <View style={s.card}>
        {signup ? (
          <>
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              maxLength={100}
            />
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              maxLength={254}
            />
            <Field
              label="Mobile number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={16}
              placeholder="10-digit Indian mobile number"
            />
          </>
        ) : (
          <Field
            label="Email or mobile number"
            value={identifier}
            onChangeText={setIdentifier}
            autoComplete="username"
            maxLength={254}
            placeholder="you@example.com or mobile number"
          />
        )}
        <Field
          label={signup ? "Password · at least 10 characters" : "Password"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={signup ? "new-password" : "current-password"}
          maxLength={128}
          onSubmitEditing={submit}
        />
        <Notice text={error} error />
        <Button
          title={signup ? "Create account" : "Sign in"}
          busy={busy}
          onPress={submit}
        />
        {!signup && (
          <Link href="/forgot-password" style={s.link}>
            Forgot password?
          </Link>
        )}
      </View>
      <Button
        title={
          signup
            ? "Already a member? Sign in"
            : "New to Matrizo? Create an account"
        }
        secondary
        disabled={busy}
        onPress={() => {
          setSignup(!signup);
          setPassword("");
          setError("");
        }}
      />
      <Text style={s.small}>
        Read how we handle your information in our{" "}
        <Link href="/privacy" style={s.link}>
          Privacy policy
        </Link>
        .
      </Text>
    </Screen>
  );
}
