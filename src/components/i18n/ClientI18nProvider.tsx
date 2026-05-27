"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { CLIENT_LANG_STORAGE_KEY } from "@/i18n/clientConstants";
import i18n from "@/i18n/clientInstance";

type ClientI18nProviderProps = {
  children: ReactNode;
};

/**
 * Alcance: rutas `/home`, `/catalogo`, `/catalogo/tour/...`.
 * Persistencia en localStorage ({@link CLIENT_LANG_STORAGE_KEY}).
 */
export function ClientI18nProvider({ children }: ClientI18nProviderProps) {
  useLayoutEffect(() => {
    try {
      const stored =
        typeof window.localStorage?.getItem === "function"
          ? window.localStorage.getItem(CLIENT_LANG_STORAGE_KEY)
          : null;
      const lng = stored === "en" ? "en" : "es";
      if (i18n.language !== lng) {
        void i18n.changeLanguage(lng);
      }
    } catch {
      /* noop */
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
