"use client";

import { useEffect } from "react";
import { ClientHero } from "./ClientHero";
import { markClientHomeVisited } from "./clientCatalogAccess";

export function ClientHomeHeroView() {
  useEffect(() => {
    markClientHomeVisited();
  }, []);

  return (
    <div className="flex min-w-0 flex-col">
      <ClientHero />
    </div>
  );
}
