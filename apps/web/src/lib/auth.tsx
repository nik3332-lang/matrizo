'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ApiError } from '@matrizo/shared';
import { api, getStoredToken, setStoredToken } from './api';

type CustomerUser = {
  id: string;
  role: 'customer';
  phone: string | null;
  name: string | null;
};

type AuthContextValue = {
  user: CustomerUser | null;
  loading: boolean;
  login: (accessToken: string, user: CustomerUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: CustomerUser }>('/account/me')
      .then((res) => setUser(res.user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setStoredToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function login(accessToken: string, user: CustomerUser) {
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
