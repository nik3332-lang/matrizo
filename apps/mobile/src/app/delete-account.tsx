import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, session } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { message } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import { Button, Field, Guest, Loading, Notice, Screen } from "@/components/ui";
export default function DeleteAccount() {
  const { user, loading } = useAuth();
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{ message: string }>("/account/deletion", {
        password,
        confirmation,
      });
      setDone(result.message);
      setPassword("");
      setConfirmation("");
      await AsyncStorage.multiRemove([
        "matrizo.push.token",
        "matrizo.push.owner",
        `matrizo.checkout.${user?.id}`,
      ]).catch(() => {});
      await session.clear();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <Screen>
        <Text style={s.title}>Your account is closed</Text>
        <Notice text={done} />
        <Button
          title="Back to the collection"
          onPress={() => router.replace("/")}
        />
      </Screen>
    );
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user) return <Guest next="/delete-account" />;
  return (
    <Screen>
      <Text style={s.eyebrow}>YOU’RE IN CONTROL</Text>
      <Text style={s.title}>Delete your account</Text>
      <View style={s.card}>
        <Text style={s.body}>
          This permanently closes your account, signs out every device and stops
          order notifications. Your name, mobile number, email, password and
          delivery addresses are removed.
        </Text>
        <Text style={s.body}>
          If you have open orders, only the details needed to complete them are
          kept until delivery or cancellation. Those details are then removed
          automatically. Deletion does not cancel an order.
        </Text>
        <Text style={s.body}>
          Order items, amounts and accounting records remain without your
          contact details. You will lose access to your order history and any
          wallet balance.
        </Text>
        <Text style={s.body}>
          This cannot be undone. Save the records you need and resolve any open
          order or balance questions before continuing.
        </Text>
      </View>
      <Field
        label="Current password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        maxLength={128}
      />
      <Field
        label="Type DELETE to confirm"
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
      />
      <Notice text={error} error />
      <Button
        title="Permanently delete account"
        danger
        busy={busy}
        disabled={confirmation !== "DELETE" || !password}
        onPress={remove}
      />
      <Button
        title="Keep my account"
        secondary
        disabled={busy}
        onPress={() => router.replace("/account")}
      />
    </Screen>
  );
}
