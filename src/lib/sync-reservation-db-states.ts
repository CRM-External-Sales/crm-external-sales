import { prisma } from "@/lib/prisma";
import {
  computeEffectiveReservationState,
  isDbCancelledState,
  type EffectiveReservationState,
} from "@/lib/reservation-lifecycle";

const CHUNK = 80;

function persistedStateFromEffective(
  e: Exclude<EffectiveReservationState, "cancelled">,
): string {
  return e;
}

/**
 * Alinea `reservation.state` en BD con el mismo criterio que la API (`computeEffectiveReservationState`).
 * No modifica reservas canceladas.
 */
export async function syncReservationStatesInDatabase(
  now: Date = new Date(),
): Promise<{ scanned: number; updated: number }> {
  const rows = await prisma.reservation.findMany({
    where: { state: { not: "cancelled" } },
    select: {
      reservation_id: true,
      state: true,
      date: true,
      time: true,
      tour: { select: { duration: true } },
    },
  });

  const updates: { id: bigint; state: string }[] = [];

  for (const r of rows) {
    if (isDbCancelledState(r.state)) {
      continue;
    }
    const effective = computeEffectiveReservationState(
      { state: r.state, date: r.date, time: r.time },
      r.tour?.duration,
      now,
    );
    if (effective === "cancelled") {
      continue;
    }
    const target = persistedStateFromEffective(effective);
    if (r.state.toLowerCase() !== target) {
      updates.push({ id: r.reservation_id, state: target });
    }
  }

  let updated = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    await prisma.$transaction(
      slice.map((u) =>
        prisma.reservation.update({
          where: { reservation_id: u.id },
          data: { state: u.state },
        }),
      ),
    );
    updated += slice.length;
  }

  return { scanned: rows.length, updated };
}
