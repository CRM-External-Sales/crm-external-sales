"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatUsd } from "@/lib/format-currency";

import { REPORT, tealAt } from "../palette";
import type {
  GraficoIngresosTiempo,
  GraficoIngresosTour,
  GraficoReservasEmpleado,
  GraficoReservasEstado,
  GraficoReservasTiempo,
  TipoReporte,
} from "../types";

function estadoEtiqueta(estado: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En curso",
    completed: "Completada",
    cancelled: "Cancelada",
  };
  return map[estado] ?? estado;
}

function isTiempoCantidad(d: unknown): d is GraficoReservasTiempo[] {
  return (
    Array.isArray(d) &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "periodo" in x &&
        "cantidad" in x &&
        typeof (x as GraficoReservasTiempo).cantidad === "number",
    )
  );
}

function isTiempoIngresos(d: unknown): d is GraficoIngresosTiempo[] {
  return (
    Array.isArray(d) &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "periodo" in x &&
        "ingresos" in x &&
        typeof (x as GraficoIngresosTiempo).ingresos === "number",
    )
  );
}

function isPorEstado(d: unknown): d is GraficoReservasEstado[] {
  return (
    Array.isArray(d) &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "estado" in x &&
        "cantidad" in x &&
        typeof (x as GraficoReservasEstado).cantidad === "number",
    )
  );
}

function isPorEmpleado(d: unknown): d is GraficoReservasEmpleado[] {
  return (
    Array.isArray(d) &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "empleado" in x &&
        "cantidad" in x &&
        typeof (x as GraficoReservasEmpleado).cantidad === "number",
    )
  );
}

function isPorTour(d: unknown): d is GraficoIngresosTour[] {
  return (
    Array.isArray(d) &&
    d.every(
      (x) =>
        x &&
        typeof x === "object" &&
        "tour" in x &&
        "ingresos" in x &&
        typeof (x as GraficoIngresosTour).ingresos === "number",
    )
  );
}

function EmptyChartMessage() {
  return (
    <div
      className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm"
      style={{
        borderColor: REPORT.borderSoft,
        backgroundColor: "rgba(255,255,255,0.92)",
        color: REPORT.textLabel,
      }}
    >
      No hay datos para los filtros seleccionados.
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div
      className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm"
      style={{
        borderColor: REPORT.borderSoft,
        backgroundColor: `${REPORT.bgSoft}cc`,
        color: REPORT.textLabel,
      }}
    >
      Genere un reporte para visualizar el gráfico.
    </div>
  );
}

type Props = {
  chartReady: boolean;
  tipoReporte: TipoReporte | null;
  datosGrafico: unknown;
};

export function ReportChart({ chartReady, tipoReporte, datosGrafico }: Props) {
  if (!chartReady || !tipoReporte) {
    return <ChartPlaceholder />;
  }

  if (tipoReporte === "reservas_tiempo") {
    if (!isTiempoCantidad(datosGrafico) || datosGrafico.length === 0) {
      return <EmptyChartMessage />;
    }
    const data = datosGrafico;
    return (
      <div
        className="rounded-2xl border bg-white p-4 shadow-sm"
        style={{ borderColor: REPORT.borderSoft }}
      >
        <p
          className="mb-3 text-center text-sm font-medium"
          style={{ color: REPORT.greenMid }}
        >
          Reservas por período
        </p>
        <div className="h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={REPORT.borderSoft} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 11, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: REPORT.borderSoft,
                }}
                formatter={(value: unknown) => [String(value ?? ""), "Cantidad"]}
              />
              <Line
                type="monotone"
                dataKey="cantidad"
                stroke={REPORT.primary}
                strokeWidth={2}
                dot={{ fill: REPORT.primary, r: 3 }}
                activeDot={{ fill: REPORT.primaryHover }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (tipoReporte === "ingresos_tiempo") {
    if (!isTiempoIngresos(datosGrafico) || datosGrafico.length === 0) {
      return <EmptyChartMessage />;
    }
    const data = datosGrafico;
    return (
      <div
        className="rounded-2xl border bg-white p-4 shadow-sm"
        style={{ borderColor: REPORT.borderSoft }}
      >
        <p
          className="mb-3 text-center text-sm font-medium"
          style={{ color: REPORT.greenMid }}
        >
          Ingresos por período
        </p>
        <div className="h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={REPORT.borderSoft} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 11, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
              />
              <YAxis
                tick={{ fontSize: 11, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: REPORT.borderSoft,
                }}
                formatter={(value: unknown) => [
                  formatUsd(Number(value)),
                  "Ingresos",
                ]}
              />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke={REPORT.primary}
                fill={REPORT.teal[0]}
                fillOpacity={0.35}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (tipoReporte === "reservas_estado") {
    if (!isPorEstado(datosGrafico) || datosGrafico.length === 0) {
      return <EmptyChartMessage />;
    }
    const data = datosGrafico.map((x) => ({
      ...x,
      nombre: estadoEtiqueta(x.estado),
    }));
    return (
      <div
        className="rounded-2xl border bg-white p-4 shadow-sm"
        style={{ borderColor: REPORT.borderSoft }}
      >
        <p
          className="mb-3 text-center text-sm font-medium"
          style={{ color: REPORT.greenMid }}
        >
          Distribución por estado (efectivo)
        </p>
        <div className="h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="cantidad"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={100}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={String(i)} fill={tealAt(i)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: REPORT.borderSoft,
                }}
              />
              <Legend wrapperStyle={{ color: REPORT.textLabel }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (tipoReporte === "reservas_empleado") {
    if (!isPorEmpleado(datosGrafico) || datosGrafico.length === 0) {
      return <EmptyChartMessage />;
    }
    const data = [...datosGrafico].slice(0, 15);
    const chartPx = Math.max(320, data.length * 40);
    return (
      <div
        className="rounded-2xl border bg-white p-4 shadow-sm"
        style={{ borderColor: REPORT.borderSoft }}
      >
        <p
          className="mb-3 text-center text-sm font-medium"
          style={{ color: REPORT.greenMid }}
        >
          Reservas por empleado
        </p>
        <div className="w-full min-w-0" style={{ height: chartPx }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={REPORT.borderSoft} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
              />
              <YAxis
                type="category"
                dataKey="empleado"
                width={120}
                tick={{ fontSize: 11, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: REPORT.borderSoft,
                }}
              />
              <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
                {data.map((_, i) => (
                  <Cell key={String(i)} fill={tealAt(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (tipoReporte === "ingresos_tour") {
    if (!isPorTour(datosGrafico) || datosGrafico.length === 0) {
      return <EmptyChartMessage />;
    }
    const data = datosGrafico;
    return (
      <div
        className="rounded-2xl border bg-white p-4 shadow-sm"
        style={{ borderColor: REPORT.borderSoft }}
      >
        <p
          className="mb-3 text-center text-sm font-medium"
          style={{ color: REPORT.greenMid }}
        >
          Ingresos por tour
        </p>
        <div className="h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={REPORT.borderSoft} />
              <XAxis
                dataKey="tour"
                tick={{ fontSize: 10, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
                interval={0}
                angle={-28}
                textAnchor="end"
                height={72}
              />
              <YAxis
                tick={{ fontSize: 11, fill: REPORT.textLabel }}
                stroke={REPORT.textLabel}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: REPORT.borderSoft,
                }}
                formatter={(value: unknown) => [
                  formatUsd(Number(value)),
                  "Ingresos",
                ]}
              />
              <Bar dataKey="ingresos" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={String(i)} fill={tealAt(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return <EmptyChartMessage />;
}
