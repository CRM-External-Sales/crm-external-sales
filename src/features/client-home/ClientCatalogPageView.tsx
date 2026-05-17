"use client";

import { TourCatalog } from "./TourCatalog";
import type { CatalogTour } from "./types";

type ClientCatalogPageViewProps = {
  initialTours: CatalogTour[];
};

export function ClientCatalogPageView({
  initialTours,
}: ClientCatalogPageViewProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <TourCatalog tours={initialTours} />
    </div>
  );
}
