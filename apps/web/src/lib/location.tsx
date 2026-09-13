'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { api } from './api';

const STORAGE_KEY = 'matrizo_pincode';

type Serviceability = { pincode: string; serviceable: boolean; etaMinutes: number | null };

type LocationState = {
  pincode: string | null;
  serviceability: Serviceability | null;
  checking: boolean;
  setPincode: (pincode: string) => Promise<void>;
};

const LocationContext = createContext<LocationState | null>(null);

// Persistent, app-wide "where am I delivering to" state — STAGE 3 moves the
// pincode/ETA check out of a one-off homepage hero and into the header,
// visible and editable on every route. Pincode itself lives in
// localStorage (same pattern as the auth token in lib/api.ts) so it
// survives a reload without needing a signed-in account.
export function LocationProvider({ children }: { children: ReactNode }) {
  const [pincode, setPincodeState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
  );
  const [serviceability, setServiceability] = useState<Serviceability | null>(null);
  const [checking, setChecking] = useState(false);

  async function check(value: string) {
    setChecking(true);
    try {
      const res = await api.get<Serviceability>(`/serviceability/${encodeURIComponent(value)}`);
      setServiceability(res);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    // Only re-validate on mount, when a stored pincode is first loaded —
    // setPincode below handles the explicit-change path itself, so this
    // intentionally doesn't re-run when `pincode` changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pincode) check(pincode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setPincode(value: string) {
    setPincodeState(value);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, value);
    await check(value);
  }

  return (
    <LocationContext.Provider value={{ pincode, serviceability, checking, setPincode }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
