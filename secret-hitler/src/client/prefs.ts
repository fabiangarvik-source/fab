"use client";

import { useCallback, useEffect, useState } from "react";
import { storage } from "./api";

export function usePref(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(initial);
  useEffect(() => {
    const s = storage(key);
    if (s !== null) setV(s === "1");
  }, [key]);
  const set = useCallback(
    (nv: boolean) => {
      setV(nv);
      storage(key, nv ? "1" : "0");
    },
    [key],
  );
  return [v, set];
}

export function useTheme(): [boolean, (light: boolean) => void] {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);
  const set = (l: boolean) => {
    setLight(l);
    document.documentElement.dataset.theme = l ? "light" : "dark";
    storage("sh:theme", l ? "light" : "dark");
  };
  return [light, set];
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
