"use client";

import { useRef, useState } from "react";
import {
  DollarSign,
  Users,
  Clock,
  Activity,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CLIENT_SURFACE = "#F2F1ED";

function normalizedWeekdayKey(day: string) {
  return day
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Etiqueta de día para mostrar (clave interna español / normalizada). */
function translateTourWeekday(day: string, tr: TFunction) {
  const nk = normalizedWeekdayKey(day);
  const k = `weekdays.${nk}` as const;
  const translated = tr(k);
  if (translated === k || !translated) return day.trim();
  return translated;
}

export type ClientTourDetailSchedule = {
  id: number;
  weekday: string | null;
  start_time: string | null;
};

export type ClientTourDetailImage = {
  id: number;
  path: string;
  alt: string | null;
};

export type ClientTourDetail = {
  id_tour: number;
  name: string;
  description: string;
  type: string;
  base_price: number;
  spots: number;
  duration: string;
  difficulty: string;
  requirements: string;
  tour_schedule: ClientTourDetailSchedule[];
  tour_image: ClientTourDetailImage[];
};

type TourDetailCardProps = {
  tour: ClientTourDetail;
};

function formatPrice(value: number, localeHint: string) {
  const tag = localeHint.startsWith("en") ? "en-US" : "es-CR";
  return new Intl.NumberFormat(tag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const SWIPE_THRESHOLD_PX = 50;

export function TourDetailCard({ tour }: TourDetailCardProps) {
  const { t: tr, i18n } = useTranslation("client");
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const images = tour.tour_image || [];
  const hasImages = images.length > 0;

  const handleNext = () => {
    setCurrentImgIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || images.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD_PX) handlePrev();
    else if (delta < -SWIPE_THRESHOLD_PX) handleNext();
    touchStartX.current = null;
  };

  const scheduleMap = new Map<string, string[]>();
  for (const s of tour.tour_schedule) {
    if (!s.weekday || !s.start_time) continue;
    const existing = scheduleMap.get(s.weekday) || [];
    existing.push(s.start_time);
    scheduleMap.set(s.weekday, existing);
  }
  const scheduleEntries = Array.from(scheduleMap.entries());

  return (
    <>
      <div
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 rounded-2xl p-8 shadow-sm lg:flex-row lg:p-12"
        style={{ backgroundColor: CLIENT_SURFACE }}
      >
        <div className="flex w-full flex-col lg:w-1/2">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="mb-3 text-2xl font-bold text-neutral-600 sm:text-3xl">
              {tour.name}
            </h1>
            <span className="inline-flex rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-600">
              {tour.type || tr("catalog.categoryFallback")}
            </span>
          </div>

          <p className="mb-8 text-sm text-neutral-600 leading-relaxed">
            {tour.description}
          </p>

          <div className="mb-8 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-neutral-600">
              <DollarSign className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {tr("detail.fromPrice", {
                  amount: formatPrice(tour.base_price, i18n.language),
                })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-600">
              <Users className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {tr("detail.capacity", { spots: tour.spots })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-600">
              <Clock className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {tr("detail.duration", { duration: tour.duration })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-600">
              <Activity className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {tr("detail.difficulty", { level: tour.difficulty })}
              </span>
            </div>
          </div>

          <div className="mb-8 flex flex-col items-start text-left">
            <h3 className="mb-3 flex items-center gap-3 text-sm font-medium text-neutral-700">
              <Calendar className="size-5 text-[#607536]" /> {tr("detail.schedules")}
            </h3>
            <div className="flex flex-col gap-2 text-sm text-neutral-600 ml-7">
              {scheduleEntries.length > 0 ? (
                scheduleEntries.map(([day, times]) => (
                  <div key={day}>
                    <span className="font-medium text-neutral-700 capitalize">
                      {translateTourWeekday(day, tr)}
                    </span>{" "}
                    - {times.join(" | ")}
                  </div>
                ))
              ) : (
                <p>{tr("detail.notAvailable")}</p>
              )}
            </div>
          </div>

          <div className="mb-10 flex flex-col items-start">
            <h3 className="mb-3 flex items-center gap-3 text-sm font-medium text-neutral-700">
              <CheckSquare className="size-5 text-[#607536]" />{" "}
              {tr("detail.requirements")}
            </h3>
            <p className="text-sm text-neutral-600 text-left w-full whitespace-pre-wrap ml-7">
              {tour.requirements || tr("detail.notAvailable")}
            </p>
          </div>

          <div className="mt-auto flex w-full justify-center lg:justify-end">
            <Button
              asChild
              className="w-full max-w-xs rounded-md bg-[#607536] px-8 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3C4A22] sm:w-auto lg:max-w-none"
            >
              <Link href={`/catalogo/tour/${tour.id_tour}/reservar`}>
                {tr("detail.bookTour")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mt-8 flex w-full min-h-[300px] flex-col items-center justify-center lg:mt-0 lg:min-h-0 lg:w-1/2">
          {hasImages ? (
            <>
              <div
                className="relative aspect-square h-full w-full max-w-lg touch-pan-y rounded-2xl overflow-hidden bg-[#F2F1ED] lg:aspect-auto lg:max-w-sm lg:h-full"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[currentImgIndex].path}
                  alt={images[currentImgIndex].alt || tour.name}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                />
              </div>

              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 shadow-sm transition-colors hover:bg-[#D6D4CB] lg:-left-4"
                    style={{ backgroundColor: CLIENT_SURFACE }}
                    aria-label={tr("detail.imgPrevAria")}
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 shadow-sm transition-colors hover:bg-[#D6D4CB] lg:-right-4"
                    style={{ backgroundColor: CLIENT_SURFACE }}
                    aria-label={tr("detail.imgNextAria")}
                  >
                    <ChevronRight className="size-5" />
                  </button>

                  <div className="mt-4 flex w-full justify-center gap-2">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImgIndex(idx)}
                        className={cn(
                          "size-2 rounded-full transition-all",
                          idx === currentImgIndex ? "bg-neutral-400 w-4" : "bg-neutral-200",
                        )}
                        aria-label={tr("detail.imgGoToAria", { n: idx + 1 })}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div
              className="flex aspect-square h-full w-full max-w-lg items-center justify-center opacity-30 rounded-2xl lg:aspect-auto lg:max-w-sm"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #c9c7c2 25%, transparent 25%),
                  linear-gradient(-45deg, #c9c7c2 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #c9c7c2 75%),
                  linear-gradient(-45deg, transparent 75%, #c9c7c2 75%)`,
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              }}
            >
              <p className="text-neutral-500 font-medium">
                {tr("detail.noImage")}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
