"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TourImageCarousel } from "@/components/tours/TourImageCarousel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTour } from "@/hooks/useTour";
import { formatUsd } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[140px_1fr] sm:items-start">
      <span className="text-muted-foreground">{label}</span>
      <div>{value}</div>
    </div>
  );
}

function formatScheduleLines(
  schedules: Array<{ weekday: string; start_time: string }>,
): string {
  const map = new Map<string, string[]>();
  for (const s of schedules) {
    if (!s.weekday?.trim() || !s.start_time?.trim()) continue;
    const key = s.weekday.trim();
    const list = map.get(key) ?? [];
    list.push(s.start_time.trim());
    map.set(key, list);
  }
  if (map.size === 0) return "—";
  return Array.from(map.entries())
    .map(([day, times]) => `${day}: ${times.join(" | ")}`)
    .join("\n");
}

function availabilityBadgeClass(availability: string) {
  if (availability === "Disponible") {
    return "bg-green-100 text-green-700";
  }
  return "bg-gray-100 text-gray-600";
}

export const TourDetailView = () => {
  const params = useParams();
  const idParam = params.id;
  const tourId = typeof idParam === "string" ? idParam : null;
  const { tour, images, loading, error } = useTour(tourId);

  const scheduleText = useMemo(() => {
    if (!tour?.tour_schedule?.length) return "—";
    return formatScheduleLines(
      tour.tour_schedule.map((s) => ({
        weekday: s.weekday,
        start_time: s.start_time,
      })),
    );
  }, [tour?.tour_schedule]);

  if (loading && !error) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
        <p className="text-center text-muted-foreground">Cargando tour…</p>
      </div>
    );
  }

  if (error && !tour) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="border-[#313833]">
          <Link href="/tours" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
      </div>
    );
  }

  if (!tour) {
    return null;
  }

  const basePrice = Number(
    typeof tour.base_price === "string" ? tour.base_price : tour.base_price,
  );

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="-ml-2 text-[#3C4A22]">
          <Link href="/tours" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <h1 className="mb-2 text-center text-2xl font-semibold text-[#3C4A22]">Tour</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        ID {String(tour.id_tour).substring(0, 8)}… ·{" "}
        {tour.supplier?.company ?? `Proveedor ${tour.supplier_corporate}`}
      </p>

      <TourImageCarousel
        images={images}
        title={tour.name}
        className="mb-6"
      />

      <div className="mb-6 space-y-3 rounded-md border border-border/60 bg-white p-4 text-sm">
        <InfoRow label="Nombre" value={tour.name} />
        <InfoRow label="Tipo" value={tour.type} />
        <InfoRow
          label="Disponibilidad"
          value={
            <span
              className={cn(
                "inline-block rounded-full px-3 py-1 text-sm font-medium",
                availabilityBadgeClass(tour.availability),
              )}
            >
              {tour.availability}
            </span>
          }
        />
        <InfoRow label="Precio base" value={formatUsd(basePrice)} />
        <InfoRow label="Espacios" value={String(tour.spots)} />
        <InfoRow label="Duración" value={tour.duration} />
        <InfoRow label="Dificultad" value={tour.difficulty} />
        <InfoRow
          label="Proveedor"
          value={
            tour.supplier
              ? `${tour.supplier.company} (${tour.supplier.email})`
              : String(tour.supplier_corporate)
          }
        />
        <InfoRow
          label="Horarios"
          value={
            <span className="whitespace-pre-line capitalize">{scheduleText}</span>
          }
        />
        <InfoRow
          label="Requisitos"
          value={
            <span className="whitespace-pre-wrap">
              {tour.requirements?.trim() || "—"}
            </span>
          }
        />
        <InfoRow
          label="Descripción"
          value={
            <span className="whitespace-pre-wrap">
              {tour.description?.trim() || "—"}
            </span>
          }
        />
      </div>
    </div>
  );
};
