import { Stack, useLocalSearchParams } from "expo-router";
import { Professionals } from "@/components/Professionals";
export default function Page() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id?: string }>();
  return (
    <>
      <Stack.Screen
        options={{ title: kind === "plumber" ? "Plumbers" : "Painters" }}
      />
      <Professionals
        kind={kind === "plumber" ? "plumber" : "painter"}
        id={id}
      />
    </>
  );
}
