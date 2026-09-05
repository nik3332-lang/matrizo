'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ApiError } from '@matrizo/shared';
import { api, getStoredToken, setStoredToken } from './api';

export type StaffUser = {
  id: string;
  role: 'store_staff' | 'admin';
  email: string | null;
  name: string | null;
  storeId: string | null;
};

type AuthContextValue = {
  user: StaffUser | null;
  loading: boolean;
  login: (accessToken: string, user: StaffUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: StaffUser }>('/account/me')
      .then((res) => {
        if (res.user.role === 'store_staff' || res.user.role === 'admin') setUser(res.user);
        else setStoredToken(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setStoredToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function login(accessToken: string, user: StaffUser) {
    setStoredToken(accessToken);
    setUser(user);
  }

  function logout() {
    setStoredToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
