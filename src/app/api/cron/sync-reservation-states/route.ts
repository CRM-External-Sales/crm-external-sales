import { NextResponse, type NextRequest } from "next/server";
import { syncReservationStatesInDatabase } from "@/lib/sync-reservation-db-states";

/**
 * GET con Authorization: Bearer <CRON_SECRET>.
 * Programar en el host (p. ej. Vercel Cron) cada 10–15 min para mantener `state` en BD sin depender del front.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 8) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET no configurado" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await syncReservationStatesInDatabase();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("sync-reservation-states:", e);
    return NextResponse.json(
      { success: false, error: "Error al sincronizar estados" },
      { status: 500 },
    );
  }
}
