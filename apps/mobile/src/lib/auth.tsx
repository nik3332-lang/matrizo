import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, session } from "./api";
import { ApiError } from "@matrizo/shared";
import {
  disableNotifications,
  prepareNotificationAccount,
} from "./notifications";
import type { CustomerSession, CustomerUser } from "./session-core";

type Auth = {
  user: CustomerUser | null;
  loading: boolean;
  login(value: CustomerSession): Promise<void>;
  logout(): Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const unsubscribe = session.subscribe(() => {
      if (mounted) setUser(session.get()?.user ?? null);
    });
    (async () => {
      await AsyncStorage.removeItem("matrizo_access_token").catch(() => {});
      await session.hydrate();
      if (session.get()) {
        const current = session.get();
        try {
          const result = await api.get<{ user: CustomerUser }>("/account/me");
          if (mounted && session.get()?.user.id === current?.user.id)
            setUser(result.user);
        } catch {
          /* Offline startup keeps the saved session; an expired refresh clears it. */
        }
      }
      if (mounted) setLoading(false);
    })().catch(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  async function logout() {
    // Confirm server-side unregistration before clearing a registered device's session.
    // If offline, keep the session so the user can retry rather than leaving notifications active.
    try {
      await disableNotifications();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401))
        throw new Error(
          "Connect to the internet to sign out and stop order notifications on this device.",
        );
      await AsyncStorage.multiRemove([
        "matrizo.push.token",
        "matrizo.push.owner",
      ]);
    }
    await session.clear();
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: async (value) => {
          await prepareNotificationAccount(value.user.id);
          await session.save(value);
        },
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}
