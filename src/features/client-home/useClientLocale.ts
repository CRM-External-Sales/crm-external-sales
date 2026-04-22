"use client";

import { useCallback, useEffect, useState } from "react";
import type { HomeLocale } from "./copy";

const STORAGE_KEY = "client-home-locale";

function readStoredLocale(): HomeLocale {
  if (typeof window === "undefined") return "es";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "en" ? "en" : "es";
}

export function useClientLocale() {
  const [locale, setLocaleState] = useState<HomeLocale>("es");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: HomeLocale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  return { locale, setLocale };
}
