import { useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { authApi, session } from "@/lib/api";
import { useResource, message } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import {
  Button,
  Field,
  Notice,
  Screen,
  Loading,
  ErrorState,
} from "@/components/ui";
export default function ForgotPassword() {
  const options = useResource<{ passwordReset: boolean }>("/auth/options");
  const [email, setEmail] = useState(""),
    [challenge, setChallenge] = useState<string | null>(null),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  async function submit() {
    setError("");
    if (challenge && password !== confirm) {
      setError("Your passwords don’t match.");
      return;
    }
    setBusy(true);
    try {
      if (!challenge) {
        const result = await authApi.post<{ challengeId: string }>(
          "/auth/password-reset/email/request",
          { email: email.trim() },
        );
        setChallenge(result.challengeId);
      } else {
        await authApi.post("/auth/password-reset/email/confirm", {
          challengeId: challenge,
          code,
          password,
        });
        await session.clear();
        setPassword("");
        setConfirm("");
        setCode("");
        setDone(true);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={s.eyebrow}>ACCOUNT RECOVERY</Text>
      <Text style={s.title}>
        {done ? "A fresh start" : "Forgot your password?"}
      </Text>
      {done ? (
        <>
          <Notice text="Your password has been updated. Sign in with your new password on each device." />
          <Link href="/login" style={s.link}>
            Return to sign in →
          </Link>
        </>
      ) : (
        <>
          {options.loading ? (
            <Loading />
          ) : options.error ? (
            <ErrorState error={options.error} retry={options.reload} />
          ) : !options.data?.passwordReset ? (
            <Notice text="Email recovery is temporarily unavailable. Please try again later. Your existing password still works." />
          ) : (
            <View style={s.card}>
              {!challenge ? (
                <>
                  <Text style={s.body}>
                    Enter your registered email. If it matches an eligible
                    account, we’ll send a one-time reset code.
                  </Text>
                  <Field
                    label="Registered email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </>
              ) : (
                <>
                  <Text style={s.body}>
                    If an account matches {email}, a code will arrive shortly.
                    Codes expire after 5 minutes.
                  </Text>
                  <Field
                    label="6-digit email code"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                  <Field
                    label="New password · at least 10 characters"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    maxLength={128}
                  />
                  <Field
                    label="Confirm new password"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    maxLength={128}
                  />
                </>
              )}
              <Notice text={error} error />
              <Button
                title={challenge ? "Reset password" : "Send reset code"}
                busy={busy}
                onPress={submit}
              />
              {challenge && (
                <Button
                  title="Use another email / request a new code"
                  secondary
                  disabled={busy}
                  onPress={() => {
                    setChallenge(null);
                    setCode("");
                    setError("");
                  }}
                />
              )}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
