/**
 * Renderiza datosGrafico en PNG (canvas) para insertar en el PDF.
 * Estilo alineado con la paleta del dashboard (reportes).
 */

import { shortenPeriodLabel } from "./export-formatting";
import { REPORT, tealAt } from "./palette";
import type {
  GraficoIngresosTiempo,
  GraficoIngresosTour,
  GraficoReservasEmpleado,
  GraficoReservasEstado,
  GraficoReservasTiempo,
  TipoReporte,
} from "./types";

const W = 720;
const H = 300;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbCss(rgb: [number, number, number], a = 1): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

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
    d.length > 0 &&
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
    d.length > 0 &&
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
    d.length > 0 &&
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
    d.length > 0 &&
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
    d.length > 0 &&
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

const pad = { l: 48, r: 24, t: 44, b: 56 };

function drawTitle(ctx: CanvasRenderingContext2D, title: string) {
  ctx.fillStyle = REPORT.greenDark;
  ctx.font = "600 15px system-ui, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 26);
}

function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  values: number[],
  yLabel: string,
  valueFormatter: (n: number) => string,
) {
  const n = values.length;
  if (n === 0) return;
  const maxV = Math.max(...values, 1);
  const minV = 0;
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const primaryRgb = hexToRgb(REPORT.primary);

  ctx.strokeStyle = REPORT.borderSoft;
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const gy = pad.t + (ch * i) / gridLines;
    ctx.beginPath();
    ctx.moveTo(pad.l, gy);
    ctx.lineTo(pad.l + cw, gy);
    ctx.stroke();
    const val = maxV - ((maxV - minV) * i) / gridLines;
    ctx.fillStyle = REPORT.textLabel;
    ctx.font = "10px system-ui, Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(valueFormatter(val), pad.l - 6, gy + 3);
  }

  const stepX = n <= 1 ? cw / 2 : cw / (n - 1);
  const pts: { x: number; y: number }[] = values.map((v, i) => {
    const x = n <= 1 ? pad.l + cw / 2 : pad.l + i * stepX;
    const y = pad.t + ch - (v / maxV) * ch;
    return { x, y };
  });

  ctx.beginPath();
  ctx.strokeStyle = rgbCss(primaryRgb, 1);
  ctx.lineWidth = 2.5;
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  const fillGrad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  fillGrad.addColorStop(0, rgbCss(primaryRgb, 0.35));
  fillGrad.addColorStop(1, rgbCss(primaryRgb, 0.02));
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.t + ch);
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.fill();

  ctx.fillStyle = REPORT.primary;
  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = REPORT.textLabel;
  ctx.font = "9px system-ui, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  labels.forEach((lb, i) => {
    const x = n <= 1 ? pad.l + cw / 2 : pad.l + i * stepX;
    const short = shortenPeriodLabel(lb, 12);
    ctx.save();
    ctx.translate(x, H - pad.b + 12);
    ctx.rotate(-0.35);
    ctx.fillText(short, 0, 0);
    ctx.restore();
  });

  ctx.save();
  ctx.translate(14, pad.t + ch / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = REPORT.textLabel;
  ctx.font = "10px system-ui, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

function drawPie(
  ctx: CanvasRenderingContext2D,
  slices: { label: string; value: number; color: string }[],
) {
  const cx = W / 2 - 36;
  const cy = H / 2 + 4;
  const r = Math.min(W * 0.22, H * 0.34);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let angle = -Math.PI / 2;
  slices.forEach((sl) => {
    const a = (sl.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + a);
    ctx.closePath();
    ctx.fillStyle = sl.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = angle + a / 2;
    if (sl.value / total > 0.06) {
      const lx = cx + Math.cos(mid) * (r * 0.58);
      const ly = cy + Math.sin(mid) * (r * 0.58);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(sl.value), lx, ly);
    }
    angle += a;
  });

  let ly = pad.t + 6;
  ctx.textAlign = "left";
  slices.forEach((sl) => {
    ctx.fillStyle = sl.color;
    ctx.fillRect(W - 132, ly, 10, 10);
    ctx.fillStyle = REPORT.greenDark;
    ctx.font = "10px system-ui, sans-serif";
    const lab = sl.label.length > 20 ? `${sl.label.slice(0, 19)}…` : sl.label;
    ctx.fillText(`${lab}: ${sl.value}`, W - 116, ly + 9);
    ly += 15;
  });
}

function drawHorizontalBars(
  ctx: CanvasRenderingContext2D,
  items: { label: string; value: number }[],
  valueFormatter: (n: number) => string,
) {
  const maxRows = 14;
  const shown = items.slice(0, maxRows);
  const max = Math.max(...shown.map((i) => i.value), 1);
  const rowH = Math.min(
    26,
    Math.floor((H - pad.t - pad.b) / Math.max(shown.length, 1)),
  );
  const barMaxW = W - pad.l - 160;
  shown.forEach((it, i) => {
    const y = pad.t + i * rowH;
    const bw = (it.value / max) * barMaxW;
    const rgb = hexToRgb(tealAt(i));
    ctx.fillStyle = rgbCss(rgb, 0.85);
    ctx.fillRect(pad.l + 100, y + 4, bw, rowH - 8);
    ctx.fillStyle = REPORT.greenDark;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    const lab =
      it.label.length > 22 ? `${it.label.slice(0, 21)}…` : it.label;
    ctx.fillText(lab, 8, y + rowH / 2 + 3);
    ctx.textAlign = "right";
    ctx.fillStyle = REPORT.textLabel;
    ctx.fillText(valueFormatter(it.value), pad.l + barMaxW + 108, y + rowH / 2 + 3);
  });
}

const CHART_TITLE: Record<TipoReporte, string> = {
  reservas_tiempo: "Reservas por período",
  reservas_estado: "Distribución por estado",
  reservas_empleado: "Reservas por empleado",
  ingresos_tiempo: "Ingresos por período",
  ingresos_tour: "Ingresos por tour",
};

/** Dimensiones del PNG del gráfico (para escalar en el PDF). */
export const PDF_CHART_DIM = { widthPx: W, heightPx: H } as const;

/**
 * Devuelve data URL PNG o null si no hay datos dibujables.
 */
export function renderReportChartToDataUrl(
  tipo: TipoReporte,
  datos: unknown,
): string | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFFCF4";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = REPORT.borderSoft;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  const title = CHART_TITLE[tipo];
  drawTitle(ctx, title);

  if (tipo === "reservas_tiempo" && isTiempoCantidad(datos)) {
    drawLineSeries(
      ctx,
      datos.map((d) => d.periodo),
      datos.map((d) => d.cantidad),
      "Cantidad",
      (n) => String(Math.round(n)),
    );
    return canvas.toDataURL("image/png");
  }

  if (tipo === "ingresos_tiempo" && isTiempoIngresos(datos)) {
    drawLineSeries(
      ctx,
      datos.map((d) => d.periodo),
      datos.map((d) => d.ingresos),
      "USD",
      (n) =>
        n >= 1000
          ? `${(n / 1000).toFixed(1)}k`
          : n.toFixed(0),
    );
    return canvas.toDataURL("image/png");
  }

  if (tipo === "reservas_estado" && isPorEstado(datos)) {
    const slices = datos.map((d, i) => ({
      label: estadoEtiqueta(d.estado),
      value: d.cantidad,
      color: tealAt(i),
    }));
    drawPie(ctx, slices);
    return canvas.toDataURL("image/png");
  }

  if (tipo === "reservas_empleado" && isPorEmpleado(datos)) {
    drawHorizontalBars(
      ctx,
      datos.map((d) => ({ label: d.empleado, value: d.cantidad })),
      (n) => String(Math.round(n)),
    );
    return canvas.toDataURL("image/png");
  }

  if (tipo === "ingresos_tour" && isPorTour(datos)) {
    drawHorizontalBars(
      ctx,
      datos.map((d) => ({ label: d.tour, value: d.ingresos })),
      (n) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(n),
    );
    return canvas.toDataURL("image/png");
  }

  return null;
}
