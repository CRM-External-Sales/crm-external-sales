import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole, AuthenticatedRequest } from "@/lib/auth-middleware";
import { CreateReservationSchema } from "@/app/schemas/reservation.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma";
import { Decimal } from "@/generated/prisma/runtime/library";

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
      // Verificar si es probablemente un campo de solo hora (1970-01-01)
      // Pero la reserva tiene campos de fecha y hora.
      // Nos basaremos en el nombre de la clave en el procesamiento recursivo del objeto si es posible,
      // pero aquí estamos serializando un valor.
      // Usaremos la cadena ISO estándar para las fechas.
      // Para el campo "time", el consumidor debe manejarlo, o lo formateamos si conocemos el contexto.
      // Dado que esta es una función recursiva genérica, simplemente devolvemos la cadena ISO.
      // El frontend puede analizar el formato.
      return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeReservationForJSON);
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'time' && value instanceof Date) {
            // Formato especial del campo de hora HH:mm
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

    // 1. Obtener Tour
    const tour = await prisma.tour.findUnique({
      where: { id_tour: body.tour_id },
    });

    if (!tour) {
      return NextResponse.json(
        { success: false, error: "El tour seleccionado no existe" },
        { status: 404 }
      );
    }

    // 2. Obtener Transfer (si se selecciona)
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

    // 3. Calcular Montos
    // Monto del tour = precio_base * personas
    const tourPrice = new Decimal(tour.base_price);
    const tourAmount = tourPrice.mul(body.people);

    // Monto del transfer = precio_venta (asumiendo tarifa plana por vehículo)
    const transferAmount = transfer ? new Decimal(transfer.sale_price) : new Decimal(0);

    const subtotal = tourAmount.add(transferAmount);
    
    // Cálculo del IVA (asumiendo 13% por ejemplo, o 0 si está incluido.
    // Mirando el esquema, hay un campo 'iva'. Usaré 0.13 según el plan).
    const IVA_RATE = 0.13;
    const iva = subtotal.mul(IVA_RATE);
    
    // Descuento (0 por ahora)
    const discount = new Decimal(0);

    const total = subtotal.add(iva).sub(discount);

    // 4. Preparar objeto Fecha Hora
    const [hours, minutes] = body.time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setUTCFullYear(1970, 0, 1);
    timeDate.setUTCHours(hours, minutes, 0, 0);

    // 5. Crear Reserva
    const reservation = await prisma.reservation.create({
      data: {
        employee_user: user.id, // ID del middleware de autenticación
        tour_id: body.tour_id,
        transfer_id: body.transfer_id,
        hotel_reservation: body.hotel_reservation,
        date: body.date, // La cadena ISO es aceptada por Prisma para DateTime
        time: timeDate,
        people: body.people,
        state: "pending", // Estado por defecto
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

// GET /api/reservations - Listar reservas con filtrado
export const GET = withRole("agent")(async (request: AuthenticatedRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const state = searchParams.get("state");

    const whereClause: any = {};

    // Filtrar por fecha
    if (date) {
        const searchDate = new Date(date);
        if (!isNaN(searchDate.getTime())) {
            const startOfDay = new Date(searchDate);
            startOfDay.setUTCHours(0,0,0,0);
            const endOfDay = new Date(searchDate);
            endOfDay.setUTCHours(23,59,59,999);
            
            whereClause.date = {
                gte: startOfDay,
                lte: endOfDay
            };
        }
    }

    // Filtrar por estado
    if (state) {
      whereClause.state = state;
    }

    if (user.role !== 'admin') {
         whereClause.employee_user = user.id;
    }

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
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
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: serializeReservationForJSON(reservations),
    });

  } catch (error) {
    console.error("Error obteniendo reservas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
});
