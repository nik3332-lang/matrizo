import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type Shade, shadeRgb } from "@matrizo/shared";
import { useResource } from "@/lib/useResource";
import { styles as s } from "@/lib/theme";
import { ErrorState, Loading } from "./ui";
export function ShadePicker({
  value,
  onChange,
}: {
  value: Shade | null;
  onChange: (shade: Shade) => void;
}) {
  const result = useResource<{ shades: Shade[] }>("/shades");
  const [family, setFamily] = useState("");
  const shades = result.data?.shades ?? [];
  const families = [...new Set(shades.map((shade) => shade.family))];
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.heading}>Choose Colour</Text>
      {result.loading && <Loading />}
      {!!result.error && (
        <ErrorState error={result.error} retry={result.reload} />
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {["", ...families].map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: family === f }}
            onPress={() => setFamily(f)}
            style={{ padding: 8, borderBottomWidth: family === f ? 2 : 0 }}
          >
            <Text>{f || "All families"}</Text>
          </Pressable>
        ))}
      </View>
      {families
        .filter((f) => !family || f === family)
        .map((f) => (
          <View key={f} style={{ gap: 8 }}>
            <Text style={s.body}>{f}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {shades
                .filter((shade) => shade.family === f)
                .map((shade) => (
                  <Pressable
                    key={shade.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${shade.name}, ${shade.hex}`}
                    accessibilityState={{ selected: value?.id === shade.id }}
                    onPress={() => onChange(shade)}
                    style={{
                      width: "47%",
                      padding: 8,
                      borderWidth: value?.id === shade.id ? 2 : 1,
                      borderColor: "#777",
                      borderRadius: 4,
                    }}
                  >
                    <View style={{ height: 64, backgroundColor: shade.hex }} />
                    <Text style={s.small}>{shade.name}</Text>
                  </Pressable>
                ))}
            </View>
          </View>
        ))}
      {!result.loading && !result.error && !shades.length && (
        <Text>No colours available.</Text>
      )}
      {value && (
        <View style={{ gap: 8 }}>
          <View
            accessibilityLabel={`${value.name} preview`}
            style={{
              height: 140,
              backgroundColor: value.hex,
              borderWidth: 1,
              borderColor: "#aaa",
            }}
          />
          <Text style={s.body}>
            {value.name} · {value.hex} · RGB {shadeRgb(value.hex)}
          </Text>
        </View>
      )}
      <Text style={s.small}>
        Screen colours may differ from the final painted finish.
      </Text>
    </View>
  );
}
