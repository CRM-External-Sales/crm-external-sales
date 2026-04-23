"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, DollarSign, Home, Languages } from "lucide-react";
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
import { CATALOG_SECTION_ID, clientTourDetailPath } from "./constants";

const CATEGORY_CHIP_ACTIVE = "#244F48";
const CATEGORY_CHIP_DEFAULT = "#3B7F73";
const CLIENT_SURFACE = "#F2F1ED";
const CATALOG_ACTION_BUTTON_CLASS =
  "h-10 shrink-0 gap-1.5 rounded-xl border-[#607536]/25 px-4 text-[#313833] shadow-sm";

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
      const normalizedType = tour.type?.trim() || "";
      const normalizedName = tour.name.trim().toLowerCase();
      const matchCat = category === "all" || normalizedType === category;
      const matchName = !q || normalizedName.includes(q);
      return matchCat && matchName;
    });
  }, [tours, search, category]);

  return (
    <section
      id={CATALOG_SECTION_ID}
      className="relative scroll-mt-16 bg-[#D6D4CB] px-4 pb-10 pt-12 sm:px-6 lg:px-8"
      aria-labelledby="catalog-heading"
    >
      <div className="mx-auto mb-8 flex max-w-7xl flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#5A665D]">
            Río Perdido
          </p>
          <h2
            id="catalog-heading"
            className="text-2xl font-semibold tracking-tight text-[#1A1F1B] sm:text-[2rem]"
          >
            {locale === "es" ? "Catálogo de tours" : "Tour catalog"}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          {onLocaleChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 gap-1.5 rounded-xl border-[#313833] bg-[#313833] px-4 text-white shadow-sm hover:bg-[#1A1F1B] hover:text-white"
                >
                  <Languages className="size-4" aria-hidden />
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
          ) : null}

          <Button
            asChild
            variant="outline"
            size="sm"
            className={CATALOG_ACTION_BUTTON_CLASS}
            style={{ backgroundColor: `${CLIENT_SURFACE}E6` }}
          >
            <Link href="/home">
              <Home className="size-4" aria-hidden />
              {t.backToHome}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        <div
          className="rounded-2xl px-3 py-2 shadow-sm sm:px-4 sm:py-3"
          style={{ backgroundColor: CLIENT_SURFACE }}
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-10 rounded-xl border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-11"
            aria-label={t.searchPlaceholder}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "shrink-0 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors",
              category === "all" ? "shadow-sm" : "opacity-90 hover:opacity-100",
            )}
            style={{
              backgroundColor:
                category === "all" ? CATEGORY_CHIP_ACTIVE : CATEGORY_CHIP_DEFAULT,
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
                  "shrink-0 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors",
                  active ? "shadow-sm" : "opacity-90 hover:opacity-100",
                )}
                style={{
                  backgroundColor: active
                    ? CATEGORY_CHIP_ACTIVE
                    : CATEGORY_CHIP_DEFAULT,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p
            className="rounded-xl px-4 py-8 text-center text-neutral-600"
            style={{ backgroundColor: `${CLIENT_SURFACE}CC` }}
          >
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
                    className={cn(
                      "flex h-full flex-col overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5",
                      "transition-[box-shadow,transform] duration-200 ease-out",
                      "hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-[#607536]/25",
                    )}
                    style={{ backgroundColor: CLIENT_SURFACE }}
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
                        <h3 className="text-lg font-bold text-[#1A1F1B]">
                          {tour.name}
                        </h3>
                        <span className="rounded-md border border-[#607536]/40 px-2 py-0.5 text-xs font-medium text-[#313833]">
                          {tour.type?.trim() || t.categoryFallback}
                        </span>
                      </div>
                      <p className="flex items-center gap-2 text-sm text-neutral-600">
                        <Clock className="size-4 shrink-0 text-[#607536]" aria-hidden />
                        <span>
                          {t.duration}: {tour.duration}
                        </span>
                      </p>
                      <p className="flex items-center gap-2 text-sm text-neutral-600">
                        <DollarSign className="size-4 shrink-0 text-[#607536]" aria-hidden />
                        <span>
                          {t.priceFrom} {formatPrice(tour.base_price, locale)}{" "}
                          {t.dollars}
                        </span>
                      </p>
                      <div className="mt-auto flex justify-center pt-2">
                        <Button
                          asChild
                          className="rounded-lg bg-[#607536] px-6 py-2 font-semibold text-white hover:bg-[#3C4A22]"
                        >
                          <Link href={clientTourDetailPath(tour.id_tour)}>
                            {t.exploreTour}
                          </Link>
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
    </section>
  );
}
