"use client";

import { TourCatalog } from "./TourCatalog";
import type { CatalogTour } from "./types";
import { useClientLocale } from "./useClientLocale";

type ClientCatalogPageViewProps = {
  initialTours: CatalogTour[];
};

export function ClientCatalogPageView({
  initialTours,
}: ClientCatalogPageViewProps) {
  const { locale, setLocale } = useClientLocale();

  return (
    <div className="flex min-w-0 flex-col">
      <TourCatalog
        tours={initialTours}
        locale={locale}
        onLocaleChange={setLocale}
      />
    </div>
  );
}
