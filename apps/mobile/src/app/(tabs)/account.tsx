import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth";
import { api, session } from "@/lib/api";
import type { CustomerUser } from "@/lib/session-core";
import {
  enableNotifications,
  disableNotifications,
  PUSH_OWNER_KEY,
} from "@/lib/notifications";
import { message, useResource } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import { Button, Field, Guest, Loading, Notice, Screen } from "@/components/ui";
export default function Account() {
  const { user, loading, logout } = useAuth();
  const [name, setName] = useState(""),
    [editing, setEditing] = useState(false),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const profile = useResource<{ user: CustomerUser }>(
    user ? "/account/me" : null,
    user?.id,
  );
  useEffect(() => {
    AsyncStorage.getItem(PUSH_OWNER_KEY)
      .then((owner) => setEnabled(!!user && owner === user.id))
      .catch(() => {});
  }, [user?.id]);
  async function act(action: () => Promise<void>, success = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (e) {
      setError(message(e, e instanceof Error ? e.message : undefined));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const result = await api.patch<{ user: CustomerUser }>("/account/me", {
      name,
    });
    const saved = session.get();
    if (saved?.user.id === result.user.id)
      await session.save({ ...saved, user: result.user });
    setEditing(false);
    await profile.reload();
  }
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user) return <Guest />;
  const current = profile.data?.user ?? user;
  return (
    <Screen onRefresh={profile.reload} refreshing={profile.loading}>
      <Text style={s.eyebrow}>YOUR MATRIZO</Text>
      <Text style={s.title}>
        Hello, {current.name?.split(" ")[0] || "there"}.
      </Text>
      <Text style={s.body}>A home for all your projects.</Text>
      <Notice text={error || profile.error} error />
      <Notice text={notice} />
      <View style={s.card}>
        <Text style={s.heading}>Personal details</Text>
        <Text style={s.body}>
          {current.email}
          {`\n`}
          {current.phone}
        </Text>
        {editing ? (
          <>
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              maxLength={100}
              autoCapitalize="words"
            />
            <Button
              title="Save name"
              busy={busy}
              onPress={() => act(save, "Your name has been updated.")}
            />
            <Button
              title="Cancel"
              secondary
              disabled={busy}
              onPress={() => setEditing(false)}
            />
          </>
        ) : (
          <Button
            title="Edit name"
            secondary
            onPress={() => {
              setName(current.name ?? "");
              setEditing(true);
            }}
          />
        )}
      </View>
      <Button
        title="Delivery addresses →"
        secondary
        onPress={() => router.push("/addresses")}
      />
      <Button
        title="Your orders →"
        secondary
        onPress={() => router.push("/orders")}
      />
      <View style={s.card}>
        <Text style={s.heading}>A little heads-up</Text>
        <Text style={s.body}>
          Optional order notifications let you know when your order is
          confirmed, dispatched, or delivered.
        </Text>
        <Button
          title={
            enabled
              ? "Turn off order notifications"
              : "Enable order notifications"
          }
          busy={busy}
          onPress={() =>
            act(
              async () => {
                if (enabled) {
                  await disableNotifications();
                  setEnabled(false);
                } else {
                  await enableNotifications();
                  setEnabled(true);
                }
              },
              enabled
                ? "Order notifications are off."
                : "Order notifications are on.",
            )
          }
        />
        <Button
          title="Open phone settings"
          secondary
          onPress={() => {
            void Linking.openSettings().catch(() =>
              setError(
                "Open your phone’s Settings to change notification permissions.",
              ),
            );
          }}
        />
      </View>
      <Button
        title="Privacy & your data →"
        secondary
        onPress={() => router.push("/privacy")}
      />
      <Button
        title="Help & support →"
        secondary
        onPress={() => router.push("/support")}
      />
      <Button
        title="Sign out"
        busy={busy}
        secondary
        onPress={() => act(logout)}
      />
      <Button
        title="Delete my account"
        secondary
        disabled={busy}
        onPress={() => router.push("/delete-account")}
      />
    </Screen>
  );
}
