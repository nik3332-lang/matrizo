import type { User } from '@matrizo/shared';
import { create } from 'zustand';

import { storage } from '../lib/storage';

const ACCESS_TOKEN_KEY = 'matrizo_access_token';
const REFRESH_TOKEN_KEY = 'matrizo_refresh_token';
const USER_KEY = 'matrizo_user';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (tokens: { accessToken: string; refreshToken: string; user: User }) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      storage.getItem(ACCESS_TOKEN_KEY),
      storage.getItem(REFRESH_TOKEN_KEY),
      storage.getItem(USER_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      user: userJson ? (JSON.parse(userJson) as User) : null,
      hydrated: true,
    });
  },

  login: async ({ accessToken, refreshToken, user }) => {
    await Promise.all([
      storage.setItem(ACCESS_TOKEN_KEY, accessToken),
      storage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      storage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ accessToken, refreshToken, user });
  },

  logout: async () => {
    await Promise.all([
      storage.removeItem(ACCESS_TOKEN_KEY),
      storage.removeItem(REFRESH_TOKEN_KEY),
      storage.removeItem(USER_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
