import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { CLIENT_LANG_STORAGE_KEY } from "@/i18n/clientConstants";
import { clientResources } from "@/i18n/resources";

function initialLng(): "es" | "en" {
  if (typeof window === "undefined") return "es";
  try {
    return window.localStorage.getItem(CLIENT_LANG_STORAGE_KEY) === "en"
      ? "en"
      : "es";
  } catch {
    return "es";
  }
}

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: initialLng(),
    fallbackLng: "es",
    defaultNS: "client",
    ns: ["client"],
    resources: clientResources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    keySeparator: ".",
    returnNull: false,
  });
}

export default i18next;
