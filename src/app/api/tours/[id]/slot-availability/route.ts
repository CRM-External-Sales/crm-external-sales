import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { ymdToReservationDateUtc } from "@/lib/tour-schedule-picker";
import {
  sumActivePeopleOnSlot,
  toSlotAvailabilityPayload,
  timeHHMMToTimeDate,
} from "@/lib/reservation-slot-availability";

const Query = z.object({
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "date debe ser YYYY-MM-DD (misma lógica que al crear reserva)",
    ),
  time: z.string().regex(/^\d{2}:\d{2}$/, "time en formato HH:MM"),
});

/**
 * Cupo por franja: `tour.spots` fijo; `used` = suma de personas en reservas no canceladas
 * mismo tour, misma fecha y hora.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id, 10);

  const handler = withAuth(async (authRequest: AuthenticatedRequest) => {
    try {
      if (Number.isNaN(tourId) || tourId < 1) {
        return NextResponse.json(
          { success: false, error: "ID de tour inválido" },
          { status: 400 },
        );
      }

      const { searchParams } = new URL(authRequest.url);
      const q = Query.safeParse({
        date: searchParams.get("date") ?? "",
        time: searchParams.get("time") ?? "",
      });
      if (!q.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Parámetros inválidos: use ?date=YYYY-MM-DD&time=HH:MM",
            details: q.error.flatten(),
          },
          { status: 400 },
        );
      }

      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
        select: { id_tour: true, spots: true },
      });
      if (!tour) {
        return NextResponse.json(
          { success: false, error: "Tour no encontrado" },
          { status: 404 },
        );
      }

      const dateU = ymdToReservationDateUtc(q.data.date);
      if (dateU == null) {
        return NextResponse.json(
          { success: false, error: "Fecha no válida" },
          { status: 400 },
        );
      }
      const timeD = timeHHMMToTimeDate(q.data.time);

      const used = await sumActivePeopleOnSlot(prisma, {
        tourId: tour.id_tour,
        date: dateU,
        time: timeD,
      });

      return NextResponse.json({
        success: true,
        data: toSlotAvailabilityPayload(used, tour.spots),
      });
    } catch (e) {
      console.error("GET slot-availability:", e);
      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}
