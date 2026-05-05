import type { Prisma } from "@/generated/prisma";

/** Estados expuestos en la API (calculados excepto `cancelled`, que se persiste). */
export type EffectiveReservationState =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

/**
 * Cota superior de duración (minutos) según la categoría almacenada en `tour.duration`.
 * "En curso" = entre inicio y fin; "completada" = a partir del fin.
 */
const DURATION_UPPER_BOUND_MINUTES: Record<string, number> = {
  "1 a 2 horas": 2 * 60,
  "3 a 4 horas": 4 * 60,
  "Medio día": 5 * 60,
  "Día completo": 8 * 60,
  "Múltiples días": 24 * 60,
};

export function tourDurationStringToEndOffsetMinutes(
  duration: string | null | undefined,
): number {
  if (duration == null || duration.trim() === "") return 2 * 60;
  return DURATION_UPPER_BOUND_MINUTES[duration] ?? 2 * 60;
}

/**
 * Desfase horario de operación: la hora guardada en BD (`time` como HH:MM en componentes UTC 1970)
 * corresponde al **reloj local** del lugar de operación (p. ej. 10:25 = 10:25 en Costa Rica, no 10:25 UTC).
 * Valor en horas respecto a UTC (Costa Rica sin DST = -6). Override: `RESERVATION_UTC_OFFSET_HOURS`.
 */
function operationUtcOffsetHours(): number {
  const raw = process.env.RESERVATION_UTC_OFFSET_HOURS;
  if (raw == null || raw === "") {
    return -6;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < -12 || n > 14) {
    return -6;
  }
  return n;
}

/** `±HH:MM` para anexar a un instante ISO con offset fijo (sin DST). */
function formatFixedOffsetForIso(hours: number): string {
  const sign = hours >= 0 ? "+" : "-";
  const a = Math.abs(Math.trunc(hours));
  return `${sign}${String(a).padStart(2, "0")}:00`;
}

/**
 * Inicio de la reserva: día de calendario de `date` (mismos componentes UTC que el API persiste para el día)
 * + hora de salida interpretada como **hora local** en el huso `RESERVATION_UTC_OFFSET_HOURS` (por defecto -6, CR).
 */
export function combineReservationDateAndTime(date: Date, time: Date): Date {
  const y = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = time.getUTCHours();
  const min = time.getUTCMinutes();
  const pad = (n: number) => String(n).padStart(2, "0");
  const off = formatFixedOffsetForIso(operationUtcOffsetHours());
  const iso = `${y}-${pad(month)}-${pad(d)}T${pad(h)}:${pad(min)}:00${off}`;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) {
    return new Date(
      Date.UTC(y, month - 1, d, h, min, 0, 0),
    );
  }
  return t;
}

/** Persistido en BD; también usado para excluir filas al sincronizar ciclo de vida. */
export function isDbCancelledState(state: string): boolean {
  return state === "cancelled" || state.toLowerCase() === "cancelada";
}

export function computeEffectiveReservationState(
  reservation: { state: string; date: Date; time: Date },
  tourDuration: string | null | undefined,
  now: Date = new Date(),
): EffectiveReservationState {
  if (isDbCancelledState(reservation.state)) {
    return "cancelled";
  }
  const start = combineReservationDateAndTime(
    reservation.date,
    reservation.time,
  );
  const minutes = tourDurationStringToEndOffsetMinutes(tourDuration);
  const endMs = start.getTime() + minutes * 60_000;
  const t = now.getTime();
  if (t < start.getTime()) {
    return "pending";
  }
  if (t < endMs) {
    return "in_progress";
  }
  return "completed";
}

/** Valores de filtro API que corresponden al ciclo de vida **calculado** (no al string crudo en BD). */
export function isLifecycleListState(
  s: string | null | undefined,
): s is "pending" | "in_progress" | "completed" {
  return (
    s === "pending" || s === "in_progress" || s === "completed"
  );
}

type ReservationRow = {
  state: string;
  date: Date;
  time: Date;
  tour?: { duration: string } | null;
};

/** Reemplaza `state` en una fila por el estado efectivo. */
export function withEffectiveReservationState<T extends ReservationRow>(
  row: T,
  now: Date = new Date(),
): T {
  const effective = computeEffectiveReservationState(
    {
      state: row.state,
      date: row.date,
      time: row.time,
    },
    row.tour?.duration,
    now,
  );
  return { ...row, state: effective } as T;
}

export function filterReservationsByEffectiveState(
  rows: Array<ReservationRow & Record<string, unknown>>,
  target: "pending" | "in_progress" | "completed",
  now: Date = new Date(),
): typeof rows {
  return rows.filter(
    (r) =>
      computeEffectiveReservationState(
        { state: r.state, date: r.date, time: r.time },
        r.tour?.duration,
        now,
      ) === target,
  );
}

/** Cláusula de filtro por el campo almacenado; el filtro por ciclo (pending, etc.) se aplica tras cargar. */
export function reservationWhereForListStateParam(
  state: string | undefined,
): Prisma.reservationWhereInput | null {
  if (state == null || state === "") {
    return null;
  }
  if (state === "cancelled") {
    return { state: "cancelled" };
  }
  if (isLifecycleListState(state)) {
    return { state: { not: "cancelled" } };
  }
  return { state };
}
