import { create } from 'zustand';

import { storage } from '../lib/storage';

// Deliberately separate from stores/auth.ts (customer session) — different
// credential, different storage key, never mixed with the customer token.
const OWNER_TOKEN_KEY = 'matrizo_owner_token';

type OwnerAuthState = {
  ownerToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (ownerToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useOwnerAuthStore = create<OwnerAuthState>((set) => ({
  ownerToken: null,
  hydrated: false,

  hydrate: async () => {
    const ownerToken = await storage.getItem(OWNER_TOKEN_KEY);
    set({ ownerToken, hydrated: true });
  },

  login: async (ownerToken) => {
    await storage.setItem(OWNER_TOKEN_KEY, ownerToken);
    set({ ownerToken });
  },

  logout: async () => {
    await storage.removeItem(OWNER_TOKEN_KEY);
    set({ ownerToken: null });
  },
}));
