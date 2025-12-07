
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole, AuthenticatedRequest } from "@/lib/auth-middleware";
import { CreateReservationSchema } from "@/app/schemas/reservation.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { ZodError } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

function serializeReservationForJSON(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return Number(obj);
  }

  if (obj instanceof Decimal) {
    return obj.toNumber();
  }

  if (obj instanceof Date) {
      // Check if it's likely a time-only field (1970-01-01)
      // But reservation has both date and time fields.
      // We'll rely on the key name in the recursive object processing if possible,
      // but here we are serializing a value.
      // Let's rely on standard ISO string for dates.
      // For "time" field, the consumer should handle it, or we format it if we know the context.
      // Since this is a generic recursive function, we just return ISO string.
      // The frontend can parse format.
      return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeReservationForJSON);
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'time' && value instanceof Date) {
            // Time field special formatting HH:mm
             const hours = String(value.getUTCHours()).padStart(2, "0");
             const minutes = String(value.getUTCMinutes()).padStart(2, "0");
             serialized[key] = `${hours}:${minutes}`;
        } else {
             serialized[key] = serializeReservationForJSON(value);
        }
    }
    return serialized;
  }

  return obj;
}

export const POST = withRole("agent")(async (request: AuthenticatedRequest, user) => {
  try {
    const json = await request.json();
    const body = CreateReservationSchema.parse(json);

    // 1. Fetch Tour
    const tour = await prisma.tour.findUnique({
      where: { id_tour: body.tour_id },
    });

    if (!tour) {
      return NextResponse.json(
        { success: false, error: "El tour seleccionado no existe" },
        { status: 404 }
      );
    }

    // 2. Fetch Transfer (if selected)
    let transfer = null;
    if (body.transfer_id) {
      transfer = await prisma.transfer.findUnique({
        where: { license_plate: body.transfer_id },
      });

      if (!transfer) {
        return NextResponse.json(
          { success: false, error: "El transfer seleccionado no existe" },
          { status: 404 }
        );
      }
    }

    // 3. Calculate Amounts
    // Tour amount = base_price * people
    const tourPrice = new Decimal(tour.base_price);
    const tourAmount = tourPrice.mul(body.people);

    // Transfer amount = sale_price (assuming flat fee per vehicle)
    const transferAmount = transfer ? new Decimal(transfer.sale_price) : new Decimal(0);

    const subtotal = tourAmount.add(transferAmount);
    
    // IVA calculation (assuming 13% for example, or 0 if included. The prompt didn't specify rate.
    // Looking at schema, there is 'iva' field. I'll use 0.13 as per plan).
    const IVA_RATE = 0.13;
    const iva = subtotal.mul(IVA_RATE);
    
    // Discount (0 for now)
    const discount = new Decimal(0);

    const total = subtotal.add(iva).sub(discount);

    // 4. Prepare Time Date object
    const [hours, minutes] = body.time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setUTCFullYear(1970, 0, 1);
    timeDate.setUTCHours(hours, minutes, 0, 0);

    // 5. Create Reservation
    const reservation = await prisma.reservation.create({
      data: {
        employee_user: user.id, // ID from auth middleware
        tour_id: body.tour_id,
        transfer_id: body.transfer_id,
        hotel_reservation: body.hotel_reservation,
        date: body.date, // ISO string is accepted by Prisma for DateTime
        time: timeDate,
        people: body.people,
        state: "pending", // Default state
        note: body.note,
        tour_amount: tourAmount,
        transfer_amount: transferAmount,
        subtotal: subtotal,
        iva: iva,
        discount: discount,
        total: total,
      },
      include: {
          tour: {
              select: {
                  name: true,
                  type: true
              }
          },
          transfer: {
              select: {
                  make: true,
                  model: true
              }
          },
          app_user: {
              select: {
                  username: true
              }
          }
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeReservationForJSON(reservation),
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(createValidationErrorResponse(error), { status: 400 });
    }

    console.error("Error creando reserva:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor al procesar la reserva" },
      { status: 500 }
    );
  }
});
