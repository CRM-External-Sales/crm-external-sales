"use client";

import { useEffect } from "react";
import { ClientHero } from "./ClientHero";
import { markClientHomeVisited } from "./clientCatalogAccess";
import { useClientLocale } from "./useClientLocale";

export function ClientHomeHeroView() {
  const { locale, setLocale } = useClientLocale();

  useEffect(() => {
    markClientHomeVisited();
  }, []);

  return (
    <div className="flex min-w-0 flex-col">
      <ClientHero locale={locale} onLocaleChange={setLocale} />
    </div>
  );
}
