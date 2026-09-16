import { useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import type { Address } from "@/lib/types";
import { message } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import { Button, Field, Notice } from "./ui";
export function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Address;
  onSaved(address: Address): void;
  onCancel(): void;
}) {
  const [form, setForm] = useState({
    label: initial?.label ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
    isDefault: initial?.isDefault ?? false,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = initial
        ? await api.patch<{ address: Address }>(
            `/account/addresses/${initial.id}`,
            form,
          )
        : await api.post<{ address: Address }>("/account/addresses", form);
      onSaved(result.address);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <Field
        label="Label (optional)"
        value={form.label}
        maxLength={50}
        onChangeText={(label) => setForm({ ...form, label })}
        placeholder="Home, site, office"
      />
      {(
        [
          ["line1", "House / building and street"],
          ["line2", "Area / landmark (optional)"],
          ["city", "City"],
          ["state", "State"],
          ["pincode", "Pincode"],
        ] as const
      ).map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={form[key]}
          onChangeText={(value) => setForm({ ...form, [key]: value })}
          autoCapitalize={key === "pincode" ? "none" : "words"}
          keyboardType={key === "pincode" ? "number-pad" : "default"}
          maxLength={
            key === "pincode"
              ? 6
              : key === "city" || key === "state"
                ? 100
                : 250
          }
        />
      ))}
      <Button
        title={form.isDefault ? "✓ Default address" : "Set as default address"}
        secondary
        disabled={busy}
        onPress={() => setForm({ ...form, isDefault: !form.isDefault })}
      />
      <Notice text={error} error />
      <Button title="Save address" onPress={submit} busy={busy} />
      <Button title="Cancel" onPress={onCancel} secondary disabled={busy} />
    </View>
  );
}
