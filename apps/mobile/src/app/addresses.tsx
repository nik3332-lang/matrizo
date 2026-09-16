import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useResource, message } from "@/lib/useResource";
import type { Address } from "@/lib/types";
import { styles as s } from "@/lib/theme";
import { AddressForm } from "@/components/AddressForm";
import {
  Button,
  Empty,
  ErrorState,
  Guest,
  Loading,
  Notice,
  Screen,
} from "@/components/ui";
export default function Addresses() {
  const { user, loading } = useAuth();
  const result = useResource<{ addresses: Address[] }>(
    user ? "/account/addresses" : null,
    user?.id,
  );
  const [edit, setEdit] = useState<Address | "new" | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/account/addresses/${id}`);
      await result.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user) return <Guest next="/addresses" />;
  return (
    <Screen refreshing={result.loading} onRefresh={result.reload}>
      <Text style={s.title}>Your places</Text>
      <Text style={s.body}>
        Home, office, or a work in progress. We’ll meet you there.
      </Text>
      <Notice text={error} error />
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      {edit ? (
        <AddressForm
          key={edit === "new" ? "new" : edit.id}
          initial={edit === "new" ? undefined : edit}
          onCancel={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            void result.reload();
          }}
        />
      ) : (
        <Button title="+ Add an address" onPress={() => setEdit("new")} />
      )}
      {result.loading && !result.data && <Loading />}
      {result.data?.addresses.length === 0 && !edit && (
        <Empty
          title="Where shall we deliver?"
          detail="Save an address to make checkout a little easier."
        />
      )}
      {result.data?.addresses.map((address) => (
        <View key={address.id} style={s.card}>
          <Text style={s.heading}>
            {address.label || address.city}
            {address.isDefault ? " · Default" : ""}
          </Text>
          <Text style={s.body}>
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            {`\n`}
            {address.city}, {address.state} · {address.pincode}
          </Text>
          <Button
            title="Edit address"
            secondary
            disabled={busy}
            onPress={() => setEdit(address)}
          />
          <Button
            title="Remove address"
            secondary
            disabled={busy}
            onPress={() => remove(address.id)}
          />
        </View>
      ))}
    </Screen>
  );
}
