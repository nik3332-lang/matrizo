'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ApiError } from '@matrizo/shared';
import { api, getStoredToken, setStoredToken } from './api';

// Only two roles ever reach this portal: 'admin' (the same shared admin
// account used across matrizo-admin too — commission/employee management is
// just another thing an admin can do) and 'sales_employee' (accounts an
// admin creates from the Employees section). Any other role's token is
// rejected below, same as a logged-out visitor.
export type PortalUser = {
  id: string;
  role: 'admin' | 'sales_employee';
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
      setLoading(false);
      return;
    }
    api
      .get<{ user: { id: string; role: string; email: string | null; name: string | null } }>('/account/me')
      .then((res) => {
        if (res.user.role === 'admin' || res.user.role === 'sales_employee') setUser(res.user as PortalUser);
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

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
