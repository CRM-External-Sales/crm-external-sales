"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Tour, User } from "@/lib/api";

import type { ReportFilterForm } from "../filter-types";
import { needsGranularidad } from "../filter-types";
import type { GranularidadTemporal, TipoReporte } from "../types";

const TIPOS_REPORTE: { value: TipoReporte; label: string }[] = [
  { value: "reservas_tiempo", label: "Reservas en el tiempo" },
  { value: "reservas_estado", label: "Reservas por estado" },
  { value: "reservas_empleado", label: "Reservas por empleado" },
  { value: "ingresos_tiempo", label: "Ingresos en el tiempo" },
  { value: "ingresos_tour", label: "Ingresos por tour" },
];

const GRANULARIDADES: { value: GranularidadTemporal; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "trimestre", label: "Trimestre" },
  { value: "año", label: "Año" },
];

const ESTADOS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

const TIPOS_RESERVA: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "con_transfer", label: "Con transfer" },
  { value: "sin_transfer", label: "Sin transfer" },
];

const selectClass =
  "flex h-10 w-full rounded-md border border-[#C3CEAB] bg-white px-3 py-2 text-sm text-[#2B3418] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#607536]/30 focus-visible:ring-offset-2";

const hintTriggerClass =
  "inline-flex shrink-0 rounded p-0.5 text-[#5a6353] hover:bg-black/[0.04] hover:text-[#3E4C23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#607536]/35";

function ReportFilterHint({
  show,
  ariaLabel,
  children,
}: {
  show: boolean;
  ariaLabel: string;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={hintTriggerClass} aria-label={ariaLabel}>
          <Info className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] px-3 py-2 text-xs leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

type Props = {
  values: ReportFilterForm;
  onChange: (patch: Partial<ReportFilterForm>) => void;
  onGenerate: () => void;
  onClear: () => void;
  loading: boolean;
  tours: Tour[];
  users: User[];
  toursLoading: boolean;
  usersLoading: boolean;
};

export function ReportFilters({
  values,
  onChange,
  onGenerate,
  onClear,
  loading,
  tours,
  users,
  toursLoading,
  usersLoading,
}: Props) {
  const showGranularidad = needsGranularidad(values.tipo_reporte);
  const estadoDisabled = values.tipo_reporte === "reservas_estado";
  const empleadoDisabled = values.tipo_reporte === "reservas_empleado";
  const tourDisabled = values.tipo_reporte === "ingresos_tour";

  const tourHint =
    tourDisabled
      ? 'tour'
      : toursLoading
        ? 'loading'
        : null;
  const empleadoHint =
    empleadoDisabled
      ? 'empleado'
      : usersLoading
        ? 'loading'
        : null;

  return (
    <div className="rounded-2xl border border-border/30 bg-white/90 p-5 shadow-sm">
      <div className="mb-4">
        <Label className="text-[#5a6353]">Reporte</Label>
        <select
          title="Tipo de reporte"
          className={`${selectClass} mt-1.5 ${!values.tipo_reporte ? "text-muted-foreground" : ""}`}
          value={values.tipo_reporte}
          onChange={(e) =>
            onChange({ tipo_reporte: e.target.value as TipoReporte })
          }
        >
          {TIPOS_REPORTE.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label className="text-[#5a6353]" htmlFor="fecha_inicio">
            Desde
          </Label>
          <Input
            id="fecha_inicio"
            type="date"
            className="border-[#C3CEAB] bg-white text-[#2B3418]"
            value={values.fecha_inicio}
            onChange={(e) => onChange({ fecha_inicio: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[#5a6353]" htmlFor="fecha_fin">
            Hasta
          </Label>
          <Input
            id="fecha_fin"
            type="date"
            className="border-[#C3CEAB] bg-white text-[#2B3418]"
            value={values.fecha_fin}
            onChange={(e) => onChange({ fecha_fin: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-[#5a6353]" htmlFor="report-filter-tour">
              Tour
            </Label>
            <ReportFilterHint
              show={tourHint === "tour"}
              ariaLabel="Por qué el filtro Tour no está disponible"
            >
              En &quot;Ingresos por tour&quot; no aplica filtrar por tour (el reporte ya desglosa por
              tour).
            </ReportFilterHint>
            <ReportFilterHint
              show={tourHint === "loading"}
              ariaLabel="Estado de carga del listado de tours"
            >
              Cargando lista de tours…
            </ReportFilterHint>
          </div>
          <select
            id="report-filter-tour"
            title="Tour"
            disabled={toursLoading || tourDisabled}
            className={`${selectClass} ${toursLoading || tourDisabled ? "cursor-not-allowed opacity-60" : ""} ${!values.tourId ? "text-muted-foreground" : ""}`}
            value={values.tourId}
            onChange={(e) => onChange({ tourId: e.target.value })}
          >
            <option value="">Todos los tours</option>
            {tours.map((t) => (
              <option key={String(t.id_tour)} value={String(t.id_tour)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-[#5a6353]" htmlFor="report-filter-estado">
              Estado
            </Label>
            <ReportFilterHint
              show={estadoDisabled}
              ariaLabel="Por qué el filtro Estado no está disponible"
            >
              En &quot;Reservas por estado&quot; no aplica filtrar por estado (el reporte ya agrupa por
              estado).
            </ReportFilterHint>
          </div>
          <select
            id="report-filter-estado"
            title="Estado"
            disabled={estadoDisabled}
            className={`${selectClass} ${estadoDisabled ? "cursor-not-allowed opacity-60" : ""} ${!values.estado ? "text-muted-foreground" : ""}`}
            value={values.estado}
            onChange={(e) => onChange({ estado: e.target.value })}
          >
            {ESTADOS.map((s) => (
              <option key={s.value || "all"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-[#5a6353]" htmlFor="report-filter-empleado">
              Empleado
            </Label>
            <ReportFilterHint
              show={empleadoHint === "empleado"}
              ariaLabel="Por qué el filtro Empleado no está disponible"
            >
              En &quot;Reservas por empleado&quot; no aplica filtrar por empleado (el reporte ya agrupa
              por empleado).
            </ReportFilterHint>
            <ReportFilterHint
              show={empleadoHint === "loading"}
              ariaLabel="Estado de carga del listado de empleados"
            >
              Cargando lista de empleados…
            </ReportFilterHint>
          </div>
          <select
            id="report-filter-empleado"
            title="Empleado"
            disabled={usersLoading || empleadoDisabled}
            className={`${selectClass} ${usersLoading || empleadoDisabled ? "cursor-not-allowed opacity-60" : ""} ${!values.usuarioId ? "text-muted-foreground" : ""}`}
            value={values.usuarioId}
            onChange={(e) => onChange({ usuarioId: e.target.value })}
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#5a6353]">Tipo reserva</Label>
          <select
            title="Tipo reserva"
            className={`${selectClass} ${!values.tipo_reserva ? "text-muted-foreground" : ""}`}
            value={values.tipo_reserva}
            onChange={(e) => onChange({ tipo_reserva: e.target.value })}
          >
            {TIPOS_RESERVA.map((s) => (
              <option key={s.value || "all"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showGranularidad && (
        <div className="mt-4 max-w-xs">
          <Label className="text-[#5a6353]">Granularidad temporal</Label>
          <select
            title="Granularidad temporal"
            className={`${selectClass} mt-1.5`}
            value={values.granularidad_temporal}
            onChange={(e) =>
              onChange({
                granularidad_temporal: e.target.value as GranularidadTemporal,
              })
            }
          >
            {GRANULARIDADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          className="bg-[#607536] text-white hover:bg-[#4F612E] active:bg-[#3E4C23]"
          disabled={loading}
          onClick={onGenerate}
        >
          {loading ? "Generando…" : "Generar reporte"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-[#C3CEAB] bg-white text-[#3E4C23] hover:bg-[#E4E9D8] hover:text-[#2B3418] active:bg-[#C3CEAB]/40"
          disabled={loading}
          onClick={onClear}
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
