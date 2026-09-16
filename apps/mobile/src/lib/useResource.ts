import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ApiError } from "@matrizo/shared";
import { api } from "./api";
export function message(
  error: unknown,
  fallback = "We couldn’t connect. Check your connection and try again.",
) {
  return error instanceof ApiError ? error.message : fallback;
}
export function useResource<T>(path: string | null, identity = "public") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const version = ++generation.current;
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.get<T>(path);
      if (version === generation.current) setData(result);
    } catch (error) {
      if (version === generation.current) setError(message(error));
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [path]);
  useFocusEffect(
    useCallback(() => {
      setData(null);
      void reload();
      return () => {
        generation.current++;
      };
    }, [reload, identity]),
  );
  return { data, error, loading, reload };
}
