import type { TourSchedule } from "@/lib/api";

/**
 * Índice JS `Date.getDay()`: 0=Domingo … 6=Sábado. Alineado con nombres en `tour_schedule.weekday`.
 */
const JS_WEEKDAY_TO_SPANISH = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export function getSpanishWeekdayFromLocalDate(d: Date): string {
  return JS_WEEKDAY_TO_SPANISH[d.getDay()] ?? "Domingo";
}

/** `yyyy-MM-dd` local (sin desfase UTC) */
export function parseLocalDateFromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function formatLocalDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** El calendario solo permite días cuyo día de la semana coincida con alguna fila de `tour_schedule`. */
export function isDateAllowedBySchedules(
  date: Date,
  schedules: Pick<TourSchedule, "weekday">[],
): boolean {
  if (!schedules.length) return false;
  const name = getSpanishWeekdayFromLocalDate(date);
  return schedules.some((s) => s.weekday?.trim() === name);
}

export function normalizeScheduleTimeToHHMM(
  raw: string | undefined | null,
): string | null {
  if (raw == null) return null;
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]!.padStart(2, "0")}:${m[2]}`;
}

/**
 * Horas ofrecidas para la fecha elegida: coinciden `weekday` de la reserva
 * (derivado de la fecha) con `tour_schedule`, sin duplicar horas.
 */
export function getTimeOptionsForYmd(
  ymd: string,
  schedules: TourSchedule[],
): { value: string; label: string }[] {
  if (!ymd) return [];
  const d = parseLocalDateFromYMD(ymd);
  if (Number.isNaN(d.getTime())) return [];
  const dayName = getSpanishWeekdayFromLocalDate(d);
  const rows = schedules.filter((s) => s.weekday?.trim() === dayName);
  const set = new Set<string>();
  for (const r of rows) {
    const t = normalizeScheduleTimeToHHMM(r.start_time);
    if (t) set.add(t);
  }
  return Array.from(set)
    .sort()
    .map((t) => ({ value: t, label: t }));
}

/**
 * Misma `Date` (UTC) que se persiste y que usa el API de cupos por franja
 * (mediodía UTC del día de calendario local).
 */
export function ymdToReservationDateUtc(ymd: string): Date | null {
  const d = parseLocalDateFromYMD(ymd);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0),
  );
}

/** Fecha a enviar a `POST` (mediodía UTC del día calendario, coherente con reservas previas). */
export function ymdToReservationDateIso(ymd: string): string {
  const d = ymdToReservationDateUtc(ymd);
  if (d == null) {
    return new Date().toISOString();
  }
  return d.toISOString();
}

export function findScheduleMatchingDateAndTime(
  ymd: string,
  timeHHmm: string,
  schedules: TourSchedule[],
): TourSchedule | undefined {
  const d = parseLocalDateFromYMD(ymd);
  if (Number.isNaN(d.getTime())) return undefined;
  const dayName = getSpanishWeekdayFromLocalDate(d);
  return schedules.find(
    (s) =>
      s.weekday?.trim() === dayName &&
      normalizeScheduleTimeToHHMM(s.start_time) === timeHHmm,
  );
}
