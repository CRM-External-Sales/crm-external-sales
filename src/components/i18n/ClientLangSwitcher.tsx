"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CLIENT_LANG_STORAGE_KEY } from "@/i18n/clientConstants";

const BTN_ACTIVE = "border-white/85 bg-white/15 text-white";
const BTN_IDLE = "border-white/35 text-white/90 hover:bg-white/10 hover:text-white";
const GREEN_ACTIVE = "border-[#607536]/55 bg-[#607536]/10 text-[#244F48]";
const GREEN_IDLE =
  "border-[#607536]/30 text-[#313833]/80 hover:bg-[#607536]/5 hover:text-[#313833]";

type Variant = "onDarkHero" | "onDarkShell" | "onLightToolbar";

export function ClientLangSwitcher({ variant }: { variant: Variant }) {
  const { t, i18n } = useTranslation("client");
  const current = i18n.language.startsWith("en") ? "en" : "es";

  const setLang = (lng: "es" | "en") => {
    if (lng === current) return;
    void i18n.changeLanguage(lng);
    try {
      window.localStorage.setItem(CLIENT_LANG_STORAGE_KEY, lng);
    } catch {
      /* noop */
    }
  };

  const isHero = variant === "onDarkHero";
  const isShell = variant === "onDarkShell";
  const isLight = variant === "onLightToolbar";

  const baseBtn =
    "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase transition-colors";

  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-lg p-0.5",
        isLight && "ring-1 ring-[#607536]/25 bg-[#F2F1ED]/95",
      )}
      role="group"
      aria-label={t("lang.toggleAria")}
    >
      <button
        type="button"
        aria-pressed={current === "es"}
        aria-label={t("lang.es")}
        className={cn(
          baseBtn,
          isLight
            ? current === "es"
              ? GREEN_ACTIVE
              : GREEN_IDLE
            : current === "es"
              ? BTN_ACTIVE
              : BTN_IDLE,
          (isHero || isShell) && "min-w-[2.75rem] justify-center",
        )}
        onClick={() => setLang("es")}
      >
        {t("lang.es")}
      </button>
      <button
        type="button"
        aria-pressed={current === "en"}
        aria-label={t("lang.en")}
        className={cn(
          baseBtn,
          isLight
            ? current === "en"
              ? GREEN_ACTIVE
              : GREEN_IDLE
            : current === "en"
              ? BTN_ACTIVE
              : BTN_IDLE,
          (isHero || isShell) && "min-w-[2.75rem] justify-center",
        )}
        onClick={() => setLang("en")}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
