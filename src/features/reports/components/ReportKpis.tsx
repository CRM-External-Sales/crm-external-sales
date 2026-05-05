"use client";

import { formatUsd } from "@/lib/format-currency";

import type { ReportKpis as ReportKpisType } from "../types";

type Props = {
  kpis: ReportKpisType | null;
};

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-[#C3CEAB] bg-white px-4 py-4 shadow-sm">
      <p className="text-2xl font-semibold tabular-nums text-[#2B3418]">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#5a6353]">
        {label}
      </p>
    </div>
  );
}

export function ReportKpis({ kpis }: Props) {
  if (!kpis) {
    return (
      <div className="rounded-2xl border border-dashed border-[#C3CEAB] bg-white/80 p-8 text-center text-sm text-[#5a6353]">
        Los KPIs aparecerán tras generar el reporte.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Total reservas" value={kpis.total_reservas} />
      <KpiCard label="Canceladas" value={kpis.reservas_canceladas} />
      <KpiCard label="No canceladas" value={kpis.reservas_no_canceladas} />
      <KpiCard label="% cancelaciones" value={`${kpis.porcentaje_cancelaciones}%`} />
      <KpiCard label="Ingresos totales" value={formatUsd(kpis.total_ingresos)} />
      <KpiCard label="Descuentos" value={formatUsd(kpis.total_descuentos)} />
      <KpiCard label="IVA" value={formatUsd(kpis.total_iva)} />
      <KpiCard label="Promedio por reserva" value={formatUsd(kpis.promedio_reserva)} />
    </div>
  );
}
