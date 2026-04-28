import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";

import { ymdToReservationDateUtc } from "@/lib/tour-schedule-picker";

import {

  timeHHMMToTimeDate,

  getTransferOccupationWindow,

  transferOccupationWindowsOverlap,

} from "@/lib/reservation-slot-availability";



const Query = z.object({

  date: z

    .string()

    .regex(

      /^\d{4}-\d{2}-\d{2}$/,

      "date debe ser YYYY-MM-DD (misma lógica que al crear reserva)",

    ),

  time: z.string().regex(/^\d{2}:\d{2}$/, "time en formato HH:MM"),

  tour_id: z.coerce.number().int().positive("tour_id es requerido y debe ser un ID de tour válido"),

});



/**

 * Matrículas cuyo transfer quedaría en conflicto con una reserva **propuesta** (fecha, hora, tour)

 * respecto a reservas **no canceladas** ya existentes, incl. solape por servicio + colchón de

 * retorno/movilidad (`TRANSFER_POST_SERVICE_BUFFER_HOURS`, default 2 h).

 */

export async function GET(request: NextRequest) {

  const handler = withAuth(async (authRequest: AuthenticatedRequest) => {

    try {

      const { searchParams } = new URL(authRequest.url);

      const q = Query.safeParse({

        date: searchParams.get("date") ?? "",

        time: searchParams.get("time") ?? "",

        tour_id: searchParams.get("tour_id") ?? "",

      });

      if (!q.success) {

        return NextResponse.json(

          {

            success: false,

            error:

              "Parámetros inválidos: use ?date=YYYY-MM-DD&time=HH:MM&tour_id= (id del tour de la reserva)",

            details: q.error.flatten(),

          },

          { status: 400 },

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



      const tour = await prisma.tour.findUnique({

        where: { id_tour: BigInt(q.data.tour_id) },

        select: { duration: true },

      });

      if (!tour) {

        return NextResponse.json(

          { success: false, error: "El tour no existe" },

          { status: 404 },

        );

      }



      const proposed = getTransferOccupationWindow(

        dateU,

        timeD,

        tour.duration,

      );



      const existing = await prisma.reservation.findMany({

        where: {

          transfer_id: { not: null },

          state: { not: "cancelled" },

        },

        include: {

          tour: { select: { duration: true } },

        },

      });



      const seen = new Set<string>();

      const busy_license_plates: number[] = [];

      for (const r of existing) {

        if (r.transfer_id == null) continue;

        const w = getTransferOccupationWindow(r.date, r.time, r.tour?.duration);

        if (!transferOccupationWindowsOverlap(proposed, w)) continue;

        const k = r.transfer_id.toString();

        if (seen.has(k)) continue;

        seen.add(k);

        busy_license_plates.push(Number(r.transfer_id));

      }



      return NextResponse.json({

        success: true,

        data: { busy_license_plates },

      });

    } catch (e) {

      console.error("GET transfers/slot-availability:", e);

      return NextResponse.json(

        { success: false, error: "Error interno del servidor" },

        { status: 500 },

      );

    }

  });



  return handler(request);

}

