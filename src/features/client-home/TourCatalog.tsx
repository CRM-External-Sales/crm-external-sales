"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleHelp, Clock, DollarSign, Home, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { resolveTourImageUrl } from "@/lib/tour-image-url";
import type { CatalogTour } from "./types";
import type { HomeLocale } from "./copy";
import { copy } from "./copy";
import { CATALOG_SECTION_ID } from "./constants";

const CORPORATE_GREEN = "#4A6741";
const CORPORATE_GREEN_MUTED = "#5c7a52";

function formatPrice(value: number, locale: HomeLocale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function pickCoverImageUrl(tour: CatalogTour): string | null {
  const imgs = tour.tour_image;
  if (!imgs?.length) return null;
  const cover = imgs.find((i) => i.is_cover);
  const raw = (cover ?? imgs[0])?.path ?? null;
  return resolveTourImageUrl(raw);
}

type TourCatalogProps = {
  tours: CatalogTour[];
  locale: HomeLocale;
  onLocaleChange?: (locale: HomeLocale) => void;
};

export function TourCatalog({
  tours,
  locale,
  onLocaleChange,
}: TourCatalogProps) {
  const t = copy[locale];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const tour of tours) {
      const c = tour.type?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, locale));
  }, [tours, locale]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tours.filter((tour) => {
      const matchCat = category === "all" || tour.type === category;
      const matchName =
        !q || tour.name.toLowerCase().includes(q);
      return matchCat && matchName;
    });
  }, [tours, search, category]);

  return (
    <section
      id={CATALOG_SECTION_ID}
      className="relative scroll-mt-16 bg-[#D6D3CC] px-4 pb-10 pt-12 sm:px-6 lg:px-8"
      aria-labelledby="catalog-heading"
    >
      {onLocaleChange ? (
        <div className="absolute right-4 top-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2 rounded-lg border-0 bg-[#3d4540] text-white shadow-sm hover:bg-[#2f3531] hover:text-white"
              >
                <Languages className="size-4 shrink-0 opacity-90" aria-hidden />
                <span className="text-sm font-medium">{t.language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem onClick={() => onLocaleChange("es")}>
                {t.spanish}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLocaleChange("en")}>
                {t.english}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 pr-10 pt-2 sm:pr-0">
        <h2
          id="catalog-heading"
          className="text-lg font-semibold tracking-tight text-[#1a1f1b] sm:text-xl"
        >
          {locale === "es" ? "Catálogo de tours" : "Tour catalog"}
        </h2>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 rounded-lg border-[#4A6741]/50 bg-white text-[#2f3d2a] hover:bg-white/90"
        >
          <Link href="/home">
            <Home className="size-4" aria-hidden />
            {t.backToHome}
          </Link>
        </Button>
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl border border-black/5 bg-white p-3 shadow-sm sm:p-4">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-12 rounded-xl border-neutral-200 bg-white text-base"
            aria-label={t.searchPlaceholder}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors",
              category === "all" ? "shadow" : "opacity-90 hover:opacity-100",
            )}
            style={{
              backgroundColor:
                category === "all" ? CORPORATE_GREEN : CORPORATE_GREEN_MUTED,
            }}
          >
            {t.allCategories}
          </button>
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors",
                  active ? "shadow" : "opacity-90 hover:opacity-100",
                )}
                style={{
                  backgroundColor: active
                    ? CORPORATE_GREEN
                    : CORPORATE_GREEN_MUTED,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl bg-white/80 px-4 py-8 text-center text-neutral-600">
            {locale === "es"
              ? "No hay tours que coincidan con tu búsqueda."
              : "No tours match your filters."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tour) => {
              const coverUrl = pickCoverImageUrl(tour);
              return (
              <li key={tour.id_tour}>
                <article
                  data-selected={selectedTourId === tour.id_tour ? "true" : undefined}
                  onClick={() =>
                    setSelectedTourId((prev) =>
                      prev === tour.id_tour ? null : tour.id_tour,
                    )
                  }
                  className={cn(
                    "flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5",
                    "transition-[box-shadow,transform] duration-200 ease-out",
                    "hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-[#4A6741]/25",
                    selectedTourId === tour.id_tour &&
                      "-translate-y-0.5 shadow-xl ring-2 ring-[#4A6741]/40",
                  )}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-neutral-200">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URLs dinámicas de almacenamiento
                      <img
                        src={coverUrl}
                        alt={tour.tour_image[0]?.alt || tour.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-full items-center justify-center"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, #c9c7c2 25%, transparent 25%),
                            linear-gradient(-45deg, #c9c7c2 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #c9c7c2 75%),
                            linear-gradient(-45deg, transparent 75%, #c9c7c2 75%)`,
                          backgroundSize: "16px 16px",
                          backgroundPosition:
                            "0 0, 0 8px, 8px -8px, -8px 0px",
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                      <h3 className="text-lg font-bold text-[#1a1f1b]">
                        {tour.name}
                      </h3>
                      <span className="rounded-md border border-[#4A6741]/40 px-2 py-0.5 text-xs font-medium text-[#2f3d2a]">
                        {tour.type?.trim() || t.categoryFallback}
                      </span>
                    </div>
                    <p className="flex items-center gap-2 text-sm text-neutral-600">
                      <Clock className="size-4 shrink-0 text-[#4A6741]" aria-hidden />
                      <span>
                        {t.duration}: {tour.duration}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 text-sm text-neutral-600">
                      <DollarSign className="size-4 shrink-0 text-[#4A6741]" aria-hidden />
                      <span>
                        {t.priceFrom} {formatPrice(tour.base_price, locale)}{" "}
                        {t.dollars}
                      </span>
                    </p>
                    <div className="mt-auto flex justify-center pt-2">
                      <Button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-xl bg-[#4A6741] px-6 font-semibold text-white hover:bg-[#3d5636]"
                      >
                        {t.exploreTour}
                      </Button>
                    </div>
                  </div>
                </article>
              </li>
            );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          document
            .getElementById(CATALOG_SECTION_ID)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        className="fixed bottom-6 right-6 z-40 flex size-11 items-center justify-center rounded-full bg-[#313833] text-white shadow-lg ring-2 ring-white/30 hover:bg-[#1A1F1B]"
        aria-label={t.helpAria}
      >
        <CircleHelp className="size-5" />
      </button>
    </section>
  );
}
