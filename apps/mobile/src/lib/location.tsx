import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text } from "react-native";
import { api } from "./api";
import { message } from "./useResource";
import { Button, Field, Notice } from "@/components/ui";
import { styles as s } from "./theme";
type Area = {
  pincode: string;
  serviceable: boolean;
  etaMinutes: number | null;
};
const Context = createContext<{
  area: Area | null;
  check(pincode: string): Promise<void>;
} | null>(null);
export function LocationProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<Area | null>(null);
  const revision = useRef(0);
  async function check(pincode: string) {
    if (!/^[1-9]\d{5}$/.test(pincode))
      throw new Error("Enter a valid 6-digit pincode.");
    const current = ++revision.current;
    const result = await api.get<Area>(`/serviceability/${pincode}`);
    if (current === revision.current) {
      setArea(result);
      await AsyncStorage.setItem("matrizo.pincode", pincode).catch(() => {});
    }
  }
  useEffect(() => {
    const current = revision.current;
    AsyncStorage.getItem("matrizo.pincode")
      .then((value) => {
        if (value && current === revision.current)
          void check(value).catch(() => {});
      })
      .catch(() => {});
  }, []);
  return (
    <Context.Provider value={{ area, check }}>{children}</Context.Provider>
  );
}
export function useLocation() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing LocationProvider");
  return value;
}
export function DeliveryArea() {
  const { area, check } = useLocation();
  const [value, setValue] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (area) setValue(area.pincode);
  }, [area?.pincode]);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await check(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>DELIVERING TO YOUR DOOR</Text>
      <View style={[s.row, { alignItems: "flex-end" }]}>
        <View style={{ flex: 1 }}>
          <Field
            label="Delivery pincode"
            value={value}
            onChangeText={setValue}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Your 6-digit pincode"
            onSubmitEditing={submit}
          />
        </View>
        <Button title="Check" busy={busy} onPress={submit} />
      </View>
      {area && (
        <Text style={s.small}>
          {area.serviceable
            ? `We deliver to ${area.pincode}.${area.etaMinutes ? ` Estimated delivery: ${area.etaMinutes} minutes, subject to stock and confirmation.` : ""}`
            : `Delivery is not available in ${area.pincode} yet. You can still explore the collection.`}
        </Text>
      )}
      <Notice text={error} error />
    </View>
  );
}
