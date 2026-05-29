import type { PrismaClient } from "@/generated/prisma";
import { Decimal } from "@/generated/prisma/runtime/library";
import {
  combineReservationDateAndTime,
  tourDurationStringToEndOffsetMinutes,
} from "@/lib/reservation-lifecycle";

type Tx = Pick<PrismaClient, "reservation">;

/**
 * Misma construcción que en POST/PUT al guardar el campo `time` (UTC 1970-01-01 + HH:MM).
 */
export function timeHHMMToTimeDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setUTCFullYear(1970, 0, 1);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Suma de personas en reservas **no canceladas** para el mismo tour, misma `date` y misma `time` en BD.
 * Opcionalmente excluye un `reservation_id` (al editar la misma reserva).
 */
export async function sumActivePeopleOnSlot(
  tx: Tx,
  params: {
    tourId: bigint;
    date: Date;
    time: Date;
    excludeReservationId?: bigint;
  },
): Promise<number> {
  const { tourId, date, time, excludeReservationId } = params;
  const agg = await tx.reservation.aggregate({
    where: {
      tour_id: tourId,
      date,
      time,
      state: { not: "cancelled" },
      ...(excludeReservationId != null
        ? { reservation_id: { not: excludeReservationId } }
        : {}),
    },
    _sum: { people: true },
  });
  return Number(agg._sum.people ?? 0);
}

export class SlotCapacityError extends Error {
  code = "SLOT_CAPACITY" as const;
  constructor(message: string) {
    super(message);
    this.name = "SlotCapacityError";
  }
}

/**
 * `tour.spots` = cupo fijo **por franja** (misma fecha + hora de salida).
 * No se descuenta en la fila `tour`; se valida con la suma de reservas activas.
 */
export async function assertFitsSlotCapacity(
  tx: Tx,
  input: {
    tourSpots: bigint;
    tourId: bigint;
    date: Date;
    time: Date;
    people: number;
    excludeReservationId?: bigint;
  },
): Promise<void> {
  const { tourSpots, tourId, date, time, people, excludeReservationId } = input;
  if (people < 1) {
    throw new SlotCapacityError("La cantidad de personas debe ser al menos 1");
  }
  const used = await sumActivePeopleOnSlot(tx, {
    tourId,
    date,
    time,
    excludeReservationId,
  });
  if (used + people > tourSpots) {
    const remaining = Math.max(0, Number(tourSpots) - used);
    throw new SlotCapacityError(
      `No hay cupo suficiente para esta fecha y hora. Quedan ${remaining} espacio(s) disponible(s) de un máximo de ${tourSpots} para este turno.`,
    );
  }
}

export function toSlotAvailabilityPayload(used: number, tourSpots: bigint) {
  const cap = Number(tourSpots);
  const remaining = Math.max(0, cap - used);
  return {
    capacity: cap,
    used,
    remaining,
  };
}

/** Serializa decimales en tours si hace falta (respuestas JSON) */
export function decimalToNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v instanceof Decimal) return v.toNumber();
  if (typeof v === "bigint") return Number(v);
  return Number(v);
}

/**
 * Misma fecha + hora: un transfer no puede estar en dos reservas activas a la vez.
 * Opcionalmente excluir una reserva (p. ej. al editar la misma).
 */
export class TransferSlotConflictError extends Error {
  code = "TRANSFER_SLOT" as const;
  constructor(message: string) {
    super(message);
    this.name = "TransferSlotConflictError";
  }
}

/** Horas extra tras el fin del servicio del tour en que el transfer sigue contando como ocupado (retorno / movilidad). Default 2. Env: `TRANSFER_POST_SERVICE_BUFFER_HOURS`. */
export function getTransferPostServiceBufferMs(): number {
  const raw = process.env.TRANSFER_POST_SERVICE_BUFFER_HOURS;
  if (raw == null || raw === "") return 2 * 3_600_000;
  const h = Number(raw);
  if (!Number.isFinite(h) || h < 0) return 2 * 3_600_000;
  return h * 3_600_000;
}

export type TransferOccupationWindow = {
  /** Inicio (fecha + hora de salida en huso de operación). */
  start: Date;
  /** Instante a partir del cual el vehículo puede volver a asignarse (fin servicio + colchón). */
  blockedUntil: Date;
};

/** Ventana [start, blockedUntil) que bloquea el transfer para otras asignaciones. */
export function getTransferOccupationWindow(
  date: Date,
  time: Date,
  tourDuration: string | null | undefined,
): TransferOccupationWindow {
  const start = combineReservationDateAndTime(date, time);
  const endOffsetMin = tourDurationStringToEndOffsetMinutes(tourDuration);
  const serviceEnd = new Date(start.getTime() + endOffsetMin * 60_000);
  const blockedUntil = new Date(
    serviceEnd.getTime() + getTransferPostServiceBufferMs(),
  );
  return { start, blockedUntil };
}

/** `true` si las dos reservas no pueden compartir el mismo vehículo (incl. colchón de retorno). */
export function transferOccupationWindowsOverlap(
  a: TransferOccupationWindow,
  b: TransferOccupationWindow,
): boolean {
  return a.start < b.blockedUntil && b.start < a.blockedUntil;
}

export async function assertTransferFreeOnSlot(
  tx: Tx,
  input: {
    transferId: string;
    date: Date;
    time: Date;
    /** Duración lógica del tour (`tour.duration`); define fin de servicio antes del colchón de retorno. */
    tourDuration: string | null | undefined;
    excludeReservationId?: bigint;
  },
): Promise<void> {
  const { transferId, date, time, tourDuration, excludeReservationId } = input;
  const proposed = getTransferOccupationWindow(date, time, tourDuration);

  const others = await tx.reservation.findMany({
    where: {
      transfer_id: transferId,
      state: { not: "cancelled" },
      ...(excludeReservationId != null
        ? { reservation_id: { not: excludeReservationId } }
        : {}),
    },
    include: {
      tour: { select: { duration: true } },
    },
  });

  for (const o of others) {
    const w = getTransferOccupationWindow(
      o.date,
      o.time,
      o.tour?.duration,
    );
    if (transferOccupationWindowsOverlap(proposed, w)) {
      throw new TransferSlotConflictError(
        "Ese vehículo ya tiene una reserva que se superpone en el tiempo, incluido el periodo de retorno y movilidad tras el servicio. Elija otra placa, fecha u hora.",
      );
    }
  }
}
