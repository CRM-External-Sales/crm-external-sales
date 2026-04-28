import { INTERNAL_SUPPLIER_CORPORATE } from "@/lib/internal-supplier";
import { combineReservationDateAndTime } from "@/lib/reservation-lifecycle";
import { withEffectiveReservationState } from "@/lib/reservation-lifecycle";

/** Anticipación mínima para anular, si el tour es de operación interna. */
export const CANCELLATION_LEAD_HOURS_INTERNAL = 24;
/** Anticipación mínima para anular, si el tour es de operación externa (proveedor no interno). */
export const CANCELLATION_LEAD_HOURS_EXTERNAL = 48;

const MS_PER_H = 3_600_000;

const INTERNAL_SUPPLIER_BIGINT = BigInt(INTERNAL_SUPPLIER_CORPORATE);

/**
 * `supplier_corporate` puede ser `BigInt` (Prisma), o `string`/`number` (drivers, caché, JSON intermedio).
 * Comparar con `=== BigInt` falla si el tipo no coincide y el tour pasa a tratarse como externo (48 h),
 * ocultando el aviso de penalidad que corresponde a operación interna (24 h).
 */
function toSupplierCorporateBigInt(
  v: bigint | number | string | null | undefined,
): bigint | null {
  if (v == null) return null;
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
      return BigInt(v);
    }
    const t = String(v).trim();
    if (t === "") return null;
    return BigInt(t);
  } catch {
    return null;
  }
}

function isInternalSupplier(
  supplierCorporate: bigint | number | string | null | undefined,
): boolean {
  const id = toSupplierCorporateBigInt(supplierCorporate);
  if (id == null) return false;
  return id === INTERNAL_SUPPLIER_BIGINT;
}

function isDbCancelledState(state: string): boolean {
  return state === "cancelled" || state.toLowerCase() === "cancelada";
}

/**
 * Monto informativo de penalidad (USD) al anular fuera del plazo, tanto para
 * operación interna (ventana 24 h) como externa (48 h). Cobro con el cliente queda fuera de la plataforma.
 * Variable de entorno `LATE_CANCELLATION_PENALTY_USD` (default 20).
 */
export function getLateCancellationPenaltyUsd(): number {
  const raw = process.env.LATE_CANCELLATION_PENALTY_USD;
  if (raw == null || raw === "") return 20;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 20;
}

export function getCancellationLeadStatus(input: {
  /** Estado persistido; si ya cancelada, no aplica plazo. */
  dbState: string;
  date: Date;
  time: Date;
  supplierCorporate: bigint | number | string | null | undefined;
  now?: Date;
}): {
  within_lead: boolean;
  lead_hours: number;
  penalty_usd: number;
  notice: string | null;
  is_internal_operation: boolean;
} {
  if (isDbCancelledState(input.dbState)) {
    return {
      within_lead: true,
      lead_hours: 0,
      penalty_usd: 0,
      notice: null,
      is_internal_operation: false,
    };
  }
  const now = input.now ?? new Date();
  const start = combineReservationDateAndTime(input.date, input.time);
  const internalOp = isInternalSupplier(input.supplierCorporate);
  const leadHours = internalOp
    ? CANCELLATION_LEAD_HOURS_INTERNAL
    : CANCELLATION_LEAD_HOURS_EXTERNAL;
  const minLeadMs = leadHours * MS_PER_H;
  const within = start.getTime() - now.getTime() >= minLeadMs;
  if (within) {
    return {
      within_lead: true,
      lead_hours: leadHours,
      penalty_usd: 0,
      notice: null,
      is_internal_operation: internalOp,
    };
  }
  const penalty = getLateCancellationPenaltyUsd();
  const opWording = internalOp
    ? "operación interna (mín. 24 h antes del inicio)"
    : "operación externa (mín. 48 h antes del inicio)";
  const notice = `Anulación fuera de plazo para ${opWording}. Aplica la misma penalidad de ${penalty} USD según política de la empresa; el agente coordina y cobra con el cliente por fuera de esta plataforma.`;
  return {
    within_lead: false,
    lead_hours: leadHours,
    penalty_usd: penalty,
    notice,
    is_internal_operation: internalOp,
  };
}

type TourLike = {
  supplier_corporate: bigint | number | string;
  duration: string;
} | null | undefined;

type ReservationForPolicy = {
  state: string;
  date: Date;
  time: Date;
  tour?: TourLike;
};

/**
 * Campos informativos de política: plazo mínimo y penalidad al anular fuera de término.
 * `cancel_forbidden_reason` se mantiene en `null` (la anulación con reconocimiento sigue vía `PUT`).
 */
function getCancelPolicyFieldsForRow(
  r: ReservationForPolicy,
  now: Date = new Date(),
): {
  is_within_cancellation_lead: boolean;
  late_cancellation_penalty_usd: number;
  late_cancellation_notice: string | null;
  cancel_forbidden_reason: null;
  is_internal_operation: boolean;
  cancellation_lead_hours: number;
} {
  if (isDbCancelledState(r.state) || !r.tour) {
    return {
      is_within_cancellation_lead: true,
      late_cancellation_penalty_usd: 0,
      late_cancellation_notice: null,
      cancel_forbidden_reason: null,
      is_internal_operation: false,
      cancellation_lead_hours: 0,
    };
  }
  const lead = getCancellationLeadStatus({
    dbState: r.state,
    date: r.date,
    time: r.time,
    supplierCorporate: r.tour.supplier_corporate,
    now,
  });
  return {
    is_within_cancellation_lead: lead.within_lead,
    late_cancellation_penalty_usd: lead.penalty_usd,
    late_cancellation_notice: lead.notice,
    cancel_forbidden_reason: null,
    is_internal_operation: lead.is_internal_operation,
    cancellation_lead_hours: lead.lead_hours,
  };
}

type RawReservationForEnrich = Parameters<
  typeof withEffectiveReservationState
>[0] & { tour?: TourLike };

/**
 * Estado efectivo + política de cancelación para respuestas JSON.
 */
export function enrichReservationForApiResponse(
  r: RawReservationForEnrich,
  now: Date = new Date(),
): ReturnType<typeof withEffectiveReservationState> & {
  is_within_cancellation_lead: boolean;
  late_cancellation_penalty_usd: number;
  late_cancellation_notice: string | null;
  cancel_forbidden_reason: null;
  is_internal_operation: boolean;
  cancellation_lead_hours: number;
} {
  const policy = getCancelPolicyFieldsForRow(
    { state: r.state, date: r.date, time: r.time, tour: r.tour },
    now,
  );
  return {
    ...withEffectiveReservationState(
      r as Parameters<typeof withEffectiveReservationState>[0],
      now,
    ),
    ...policy,
  };
}
