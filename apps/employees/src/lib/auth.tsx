"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "@matrizo/shared";
import { api, getStoredToken, setStoredToken } from "./api";

// Sales staff and tradespeople have separate workspaces and API permissions.
export type PortalUser = {
  id: string;
  role: "admin" | "sales_employee" | "painter" | "plumber";
  email: string | null;
  name: string | null;
};

type AuthContextValue = {
  user: PortalUser | null;
  loading: boolean;
  login: (accessToken: string, user: PortalUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      void Promise.resolve().then(() => setLoading(false));
      return;
    }
    api
      .get<{
        user: {
          id: string;
          role: string;
          email: string | null;
          name: string | null;
        };
      }>("/account/me")
      .then((res) => {
        if (
          ["admin", "sales_employee", "painter", "plumber"].includes(
            res.user.role,
          )
        )
          setUser(res.user as PortalUser);
        else setStoredToken(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setStoredToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function login(accessToken: string, user: PortalUser) {
    setStoredToken(accessToken);
    setUser(user);
  }

  function logout() {
    setStoredToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
