import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateReservationSchema } from "@/app/schemas/reservation.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
// import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { Decimal } from "@/generated/prisma/runtime/library";

// Función auxiliar para serializar (reutilizada, se puede mover a utils más tarde)
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
      return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeReservationForJSON);
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'time' && value instanceof Date) {
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


// GET /api/reservations/:id - Obtener reserva por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const reservationId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      if (isNaN(reservationId)) {
        return NextResponse.json(
          { success: false, error: "ID de reserva inválido" },
          { status: 400 }
        );
      }

      const reservation = await prisma.reservation.findUnique({
        where: { reservation_id: BigInt(reservationId) },
        include: {
          tour: {
            select: { name: true, type: true }
          },
          transfer: {
             select: { make: true, model: true }
          },
          app_user: {
             select: { username: true }
          }
        }
      });

      if (!reservation) {
        return NextResponse.json(
          { success: false, error: "Reserva no encontrada" },
          { status: 404 }
        );
      }

      // Verificar permiso de acceso (Admin o Propietario)
      if (user.role !== 'admin' && reservation.employee_user !== user.id) {
          return NextResponse.json(
              { success: false, error: "No tiene permiso para ver esta reserva" },
              { status: 403 }
          );
      }

      return NextResponse.json({
        success: true,
        data: serializeReservationForJSON(reservation),
      });

    } catch (error) {
      console.error("Error getting reservation:", error);
      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  });

  return handler(request);
}

// PUT /api/reservations/:id - Actualizar reserva
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const reservationId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      if (isNaN(reservationId)) {
        return NextResponse.json(
          { success: false, error: "ID de reserva inválido" },
          { status: 400 }
        );
      }

      // 1. Validar Permiso de Admin (Requisito: "permitir a los administradores gestionar reservas")
      if (user.role !== 'admin') {
           return NextResponse.json(
              { success: false, error: "Solo los administradores pueden modificar reservas" },
              { status: 403 }
          );
      }

      const existingReservation = await prisma.reservation.findUnique({
          where: { reservation_id: BigInt(reservationId) },
          include: { tour: true, transfer: true }
      });

      if (!existingReservation) {
        return NextResponse.json(
          { success: false, error: "Reserva no encontrada" },
          { status: 404 }
        );
      }

      const json = await authRequest.json();
      const body = UpdateReservationSchema.parse(json);

      // Datos para actualizar
      const updateData: any = { ...body };
      
      // Recalcular montos si cambia tour, personas o transfer
      // Si cambiamos el tour, necesitamos un nuevo precio base.
      // Si cambiamos la cantidad de personas, necesitamos un nuevo multiplicador.
      // Si cambiamos el transfer, necesitamos un nuevo precio de transfer.
      // Esto es complejo porque podríamos estar actualizando solo un campo pero otros afectan el cálculo.
      // Estrategia:
      // 1. Obtener valores actuales para elementos de cálculo.
      // 2. Sobrescribir con nuevos valores si están presentes.
      // 3. Recalcular todo si algún elemento de cálculo cambió.

      let needsRecalculation = false;
      if (body.tour_id || body.people || body.transfer_id !== undefined) {
          needsRecalculation = true;
      }

      if (needsRecalculation) {
          const currentTourId = body.tour_id || Number(existingReservation.tour_id);
          const currentPeople = body.people || existingReservation.people;
          
          let currentTransferId = null;
          if (body.transfer_id !== undefined) {
              currentTransferId = body.transfer_id; // Puede ser null
          } else {
              currentTransferId = existingReservation.transfer_id ? Number(existingReservation.transfer_id) : null;
          }

          // Obtener datos frescos si los IDs cambiaron, o usar los existentes si no (pero es más fácil obtener nuevos para mayor seguridad/simplicidad)
          // Idealmente obtenemos lo que necesitamos.

          const tour = await prisma.tour.findUnique({ where: { id_tour: BigInt(currentTourId) }});
          if (!tour) throw new Error("Tour no encontrado para recalculo");

          let transfer = null;
          if (currentTransferId) {
               transfer = await prisma.transfer.findUnique({ where: { license_plate: BigInt(currentTransferId) } });
               if (!transfer) throw new Error("Transfer no encontrado para recalculo");
          }

          const tourPrice = new Decimal(tour.base_price);
          const tourAmount = tourPrice.mul(currentPeople);
          const transferAmount = transfer ? new Decimal(transfer.sale_price) : new Decimal(0);
          
          const subtotal = tourAmount.add(transferAmount);
          const IVA_RATE = 0.13;
          const iva = subtotal.mul(IVA_RATE);
          const discount = new Decimal(0); // ¿Mantener simple o preservar existente? Reiniciaremos/mantendremos en 0 según la lógica.
          const total = subtotal.add(iva).sub(discount);

          // Preparar datos de actualización
          updateData.tour_amount = tourAmount;
          updateData.transfer_amount = transferAmount;
          updateData.subtotal = subtotal;
          updateData.iva = iva;
          updateData.total = total;
          
          // Asegurarse de convertir la hora si se proporciona
          if (body.time) {
              const [hours, minutes] = body.time.split(':').map(Number);
              const timeDate = new Date();
              timeDate.setUTCFullYear(1970, 0, 1);
              timeDate.setUTCHours(hours, minutes, 0, 0);
              updateData.time = timeDate;
          }
      } else {
          // Si solo se actualiza estado/notas/nombre_invitado, no se necesita cálculo.
           if (body.time) {
              const [hours, minutes] = body.time.split(':').map(Number);
              const timeDate = new Date();
              timeDate.setUTCFullYear(1970, 0, 1);
              timeDate.setUTCHours(hours, minutes, 0, 0);
              updateData.time = timeDate;
          }
      }

      const updatedReservation = await prisma.reservation.update({
          where: { reservation_id: BigInt(reservationId) },
          data: updateData,
          include: {
            tour: { select: { name: true, type: true } },
            transfer: { select: { make: true, model: true } },
            app_user: { select: { username: true } }
          }
      });

      return NextResponse.json({
        success: true,
        message: "Reserva actualizada exitosamente",
        data: serializeReservationForJSON(updatedReservation),
      });

    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(createValidationErrorResponse(error), { status: 400 });
      }

      console.error("Error updating reservation:", error);
      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  });

  return handler(request);
}
