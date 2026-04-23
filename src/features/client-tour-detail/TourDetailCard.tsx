"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { copy } from "@/features/client-home/copy";
import { useClientLocale } from "@/features/client-home/useClientLocale";
import { cn } from "@/lib/utils";

const CLIENT_SURFACE = "#F2F1ED";

/** Diccionario de días de la semana ES → EN */
const weekdayTranslations: Record<string, Record<string, string>> = {
  es: {
    lunes: "Lunes",
    martes: "Martes",
    miércoles: "Miércoles",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sábado: "Sábado",
    sabado: "Sábado",
    domingo: "Domingo",
  },
  en: {
    lunes: "Monday",
    martes: "Tuesday",
    miércoles: "Wednesday",
    miercoles: "Wednesday",
    jueves: "Thursday",
    viernes: "Friday",
    sábado: "Saturday",
    sabado: "Saturday",
    domingo: "Sunday",
  },
};

export function translateWeekday(day: string, locale: "es" | "en"): string {
  const key = day.trim().toLowerCase();
  return weekdayTranslations[locale]?.[key] ?? day;
}

export type ClientTourDetailSchedule = {
  id: number;
  weekday: string | null;
  start_time: string | null; // formatted
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

function formatPrice(value: number, locale: "es" | "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function TourDetailCard({ tour }: TourDetailCardProps) {
  const { locale } = useClientLocale();
  const t = copy[locale];
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const images = tour.tour_image || [];
  const hasImages = images.length > 0;

  const handleNext = () => {
    setCurrentImgIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Agrupar horarios por día
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
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 rounded-2xl p-8 shadow-sm md:flex-row md:p-12"
        style={{ backgroundColor: CLIENT_SURFACE }}
      >
        {/* Columna Izquierda: Información */}
        <div className="flex w-full flex-col md:w-1/2">
          {/* Título y Categoría (Centrados) */}
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="mb-3 text-2xl font-bold text-neutral-600 sm:text-3xl">
              {tour.name}
            </h1>
            <span className="inline-flex rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-600">
              {tour.type || t.categoryFallback}
            </span>
          </div>

          {/* Descripción */}
          <p className="mb-8 text-sm text-neutral-600 leading-relaxed">
            {tour.description}
          </p>

          {/* Grid de 4 elementos */}
          <div className="mb-8 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-neutral-600">
              <DollarSign className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {t.priceFrom} {formatPrice(tour.base_price, locale)} {t.dollars}
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-600">
              <Users className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {t.capacity} - {tour.spots} {t.persons}
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-600">
              <Clock className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {t.duration} {tour.duration}
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-600">
              <Activity className="size-5 shrink-0 text-[#607536]" />
              <span className="text-sm font-medium">
                {t.difficulty} - {tour.difficulty}
              </span>
            </div>
          </div>

          {/* Horarios (Alineados a la izquierda) */}
          <div className="mb-8 flex flex-col items-start text-left">
            <h3 className="mb-3 flex items-center gap-3 text-sm font-medium text-neutral-700">
              <Calendar className="size-5 text-[#607536]" /> {t.schedules}
            </h3>
            <div className="flex flex-col gap-2 text-sm text-neutral-600 ml-7">
              {scheduleEntries.length > 0 ? (
                scheduleEntries.map(([day, times]) => (
                  <div key={day}>
                    <span className="font-medium text-neutral-700 capitalize">{translateWeekday(day, locale)}</span> - {times.join(" | ")}
                  </div>
                ))
              ) : (
                <p>N/A</p>
              )}
            </div>
          </div>

          {/* Requisitos */}
          <div className="mb-10 flex flex-col items-start">
            <h3 className="mb-3 flex items-center gap-3 text-sm font-medium text-neutral-700">
              <CheckSquare className="size-5 text-[#607536]" /> {t.requirements}
            </h3>
            <p className="text-sm text-neutral-600 text-left w-full whitespace-pre-wrap ml-7">
              {tour.requirements || "N/A"}
            </p>
          </div>

          {/* Botón Reservar (Alineado a la derecha) */}
          <div className="mt-auto flex justify-end">
            <Button
              asChild
              className="rounded-md bg-[#607536] px-8 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3C4A22]"
            >
              <Link href={`/catalogo/tour/${tour.id_tour}/reservar`}>
                {t.bookTour}
              </Link>
            </Button>
          </div>
        </div>

        {/* Columna Derecha: Carrusel */}
        <div className="relative mt-8 flex w-full min-h-[300px] md:mt-0 md:min-h-0 md:w-1/2 flex-col justify-center items-center">
          {hasImages ? (
            <>
              <div className="relative h-full w-full max-w-sm aspect-square md:aspect-auto md:h-full rounded-2xl overflow-hidden bg-[#F2F1ED]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[currentImgIndex].path}
                  alt={images[currentImgIndex].alt || tour.name}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                />
              </div>

              {/* Botones y Paginación (Afuera de la imagen) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 shadow-sm transition-colors hover:bg-[#D6D4CB] md:-left-4"
                    style={{ backgroundColor: CLIENT_SURFACE }}
                    aria-label="Anterior imagen"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 shadow-sm transition-colors hover:bg-[#D6D4CB] md:-right-4"
                    style={{ backgroundColor: CLIENT_SURFACE }}
                    aria-label="Siguiente imagen"
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
                          idx === currentImgIndex ? "bg-neutral-400 w-4" : "bg-neutral-200"
                        )}
                        aria-label={`Ir a imagen ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div
              className="flex h-full w-full max-w-sm aspect-square md:aspect-auto items-center justify-center opacity-30 rounded-2xl"
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
              <p className="text-neutral-500 font-medium">Sin imagen</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
