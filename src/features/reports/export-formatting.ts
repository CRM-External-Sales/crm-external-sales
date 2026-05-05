/**
 * Formato legible para exportaciones (PDF/XLSX), sin tocar el backend.
 */

const MONTH_NAMES_ES = [
  "ene.",
  "feb.",
  "mar.",
  "abr.",
  "may.",
  "jun.",
  "jul.",
  "ago.",
  "sep.",
  "oct.",
  "nov.",
  "dic.",
] as const;

/** Convierte fecha API (YYYY-MM-DD o ISO) a DD/MM/YYYY */
export function formatDdMmYyyy(value: string): string {
  const s = value.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (ymd) {
    const [, y, mo, d] = ymd;
    return `${d}/${mo}/${y}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) {
    return s;
  }
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const y = dt.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/** Periodo en una línea: "DD/MM/YYYY – DD/MM/YYYY" */
export function formatPeriodoLine(fechaInicio: string, fechaFin: string): string {
  return `${formatDdMmYyyy(fechaInicio)} – ${formatDdMmYyyy(fechaFin)}`;
}

/** Etiqueta amigable para granularidad */
export function granularidadLabel(g: string | null | undefined): string | null {
  if (g == null || g === "") return null;
  const map: Record<string, string> = {
    semana: "Semana",
    mes: "Mes",
    trimestre: "Trimestre",
    año: "Año",
  };
  return map[g] ?? g;
}

/**
 * Fecha de reserva (campo `date`) → DD/MM/YYYY sin correr el día por zona horaria
 * cuando viene como ISO solo fecha en los primeros 10 caracteres.
 */
export function formatReservationDateForExport(iso: string): string {
  const head = iso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    const [y, m, d] = head.split("-");
    return `${d}/${m}/${y}`;
  }
  return formatDdMmYyyy(iso);
}

/**
 * Hora de reserva: ya viene "HH:mm" del API o ISO legacy con fecha 1970.
 */
export function formatReservationTimeForExport(time: string | undefined | null): string {
  if (time == null || String(time).trim() === "") {
    return "—";
  }
  const t = String(time).trim();
  if (/^\d{1,2}:\d{2}/.test(t)) {
    const [hh, mm] = t.split(":");
    return `${hh.padStart(2, "0")}:${(mm ?? "00").slice(0, 2)}`;
  }
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) {
    const d = new Date(t);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  return t.replace(/^.*T/i, "").slice(0, 5) || "—";
}

/** Fecha y hora de generación del PDF */
export function formatGeneratedAt(now: Date = new Date()): string {
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

/** Acorta etiquetas largas en el eje X del gráfico */
export function shortenPeriodLabel(periodo: string, maxLen: number): string {
  const s = periodo.trim();
  if (s.length <= maxLen) return s;
  const q = /^Q(\d)\s+(\d{4})$/.exec(s);
  if (q) return `T${q[1]} ${q[2]}`;
  const mesAnio = /^(\d{4})-(\d{2})$/.exec(s);
  if (mesAnio) {
    const monthIdx = parseInt(mesAnio[2], 10) - 1;
    const name = MONTH_NAMES_ES[monthIdx] ?? mesAnio[2];
    return `${name} ${mesAnio[1]}`;
  }
  return `${s.slice(0, maxLen - 1)}…`;
}
