"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { api } from "./api";
const STORAGE_KEY = "matrizo_pincode";
type Serviceability = {
  pincode: string;
  serviceable: boolean;
  etaMinutes: number | null;
};
type LocationState = {
  pincode: string | null;
  serviceability: Serviceability | null;
  checking: boolean;
  error: string;
  setPincode: (pincode: string) => Promise<boolean>;
};
const LocationContext = createContext<LocationState | null>(null);
export function LocationProvider({ children }: { children: ReactNode }) {
  const [pincode, setPincodeState] = useState<string | null>(null);
  const [serviceability, setServiceability] = useState<Serviceability | null>(
    null,
  );
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  async function setPincode(value: string): Promise<boolean> {
    if (!/^\d{6}$/.test(value)) {
      setError("Enter a valid 6-digit pincode.");
      return false;
    }
    const id = ++request.current;
    setChecking(true);
    setError("");
    setServiceability(null);
    try {
      const result = await api.get<Serviceability>(`/serviceability/${value}`);
      if (id !== request.current) return false;
      setPincodeState(value);
      setServiceability(result);
      window.localStorage.setItem(STORAGE_KEY, value);
      return result.serviceable;
    } catch {
      if (id === request.current)
        setError(
          "Delivery availability could not be checked. Please try again.",
        );
      return false;
    } finally {
      if (id === request.current) setChecking(false);
    }
  }
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      void Promise.resolve().then(() => setPincode(stored));
    }
  }, []);
  return (
    <LocationContext.Provider
      value={{ pincode, serviceability, checking, error, setPincode }}
    >
      {children}
    </LocationContext.Provider>
  );
}
export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("Missing LocationProvider");
  return ctx;
}
