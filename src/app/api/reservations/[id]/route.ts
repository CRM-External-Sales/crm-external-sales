import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateReservationSchema } from "@/app/schemas/reservation.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
// import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { Decimal } from "@/generated/prisma/runtime/library";
import { serializeReservationForJSON } from "@/lib/serialize-reservation-for-json";
import {
  assertFitsSlotCapacity,
  assertTransferFreeOnSlot,
  SlotCapacityError,
  timeHHMMToTimeDate,
  TransferSlotConflictError,
} from "@/lib/reservation-slot-availability";
import {
  enrichReservationForApiResponse,
  getCancellationLeadStatus,
} from "@/lib/reservation-cancellation-policy";

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
            select: {
              name: true,
              type: true,
              duration: true,
              supplier_corporate: true,
            },
          },
          transfer: {
            select: { license_plate: true, make: true, model: true },
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
        data: serializeReservationForJSON(
          enrichReservationForApiResponse(
            reservation as Parameters<typeof enrichReservationForApiResponse>[0],
          ),
        ),
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

      const existingReservation = await prisma.reservation.findUnique({
        where: { reservation_id: BigInt(reservationId) },
        include: { tour: true, transfer: true },
      });

      if (!existingReservation) {
        return NextResponse.json(
          { success: false, error: "Reserva no encontrada" },
          { status: 404 }
        );
      }

      const json = await authRequest.json();
      const body = UpdateReservationSchema.parse(json);

      if (body.state === "cancelled") {
        if (existingReservation.state === "cancelled") {
          return NextResponse.json(
            { success: false, error: "La reserva ya está cancelada" },
            { status: 400 },
          );
        }
        const adminMerge =
          user.role === "admin"
            ? {
                tourId:
                  body.tour_id !== undefined
                    ? BigInt(body.tour_id)
                    : existingReservation.tour_id,
                date:
                  body.date !== undefined
                    ? new Date(body.date)
                    : existingReservation.date,
                time:
                  body.time !== undefined
                    ? timeHHMMToTimeDate(body.time)
                    : existingReservation.time,
              }
            : {
                tourId: existingReservation.tour_id,
                date: existingReservation.date,
                time: existingReservation.time,
              };
        const tourForPolicy = await prisma.tour.findUnique({
          where: { id_tour: adminMerge.tourId },
          select: { supplier_corporate: true },
        });
        if (!tourForPolicy) {
          return NextResponse.json(
            { success: false, error: "El tour de la reserva no existe" },
            { status: 404 },
          );
        }
        const lead = getCancellationLeadStatus({
          dbState: existingReservation.state,
          date: adminMerge.date,
          time: adminMerge.time,
          supplierCorporate: tourForPolicy.supplier_corporate,
        });
        if (!lead.within_lead && !body.acknowledge_late_cancellation) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Anulación fuera del plazo mínimo: debe confirmar con acknowledge_late_cancellation: true tras informar al cliente la penalidad aplicable (el cobro se gestiona fuera de la plataforma).",
              code: "LATE_CANCELLATION_ACK_REQUIRED",
              late_cancellation_penalty_usd: lead.penalty_usd,
            },
            { status: 400 },
          );
        }
      }

      const isAgentOwner =
        user.role === "agent" && existingReservation.employee_user === user.id;

      if (isAgentOwner) {
        const presentKeys = Object.entries(body)
          .filter(([, v]) => v !== undefined)
          .map(([k]) => k);
        const allowed = new Set([
          "state",
          "cancellation_reason",
          "note",
          "acknowledge_late_cancellation",
        ]);
        if (presentKeys.length === 0) {
          return NextResponse.json(
            { success: false, error: "No se enviaron campos para actualizar" },
            { status: 400 },
          );
        }
        for (const k of presentKeys) {
          if (!allowed.has(k)) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Como agente solo puede anular la reserva (con motivo) o modificar la nota",
              },
              { status: 403 },
            );
          }
        }

        const data: {
          state?: string;
          cancellation_reason?: string | null;
          note?: string;
        } = {};
        if (body.state === "cancelled") {
          data.state = "cancelled";
        }
        if (body.cancellation_reason !== undefined) {
          data.cancellation_reason = body.cancellation_reason;
        }
        if (body.note !== undefined) {
          data.note = body.note;
        }

        const finalStateForAgent =
          body.state === "cancelled"
            ? "cancelled"
            : existingReservation.state;

        const updatedAsAgent = await prisma.$transaction(async (tx) => {
          if (finalStateForAgent !== "cancelled") {
            const t = await tx.tour.findUnique({
              where: { id_tour: existingReservation.tour_id },
            });
            if (!t) {
              throw new Error("TOUR_NOT_FOUND");
            }
            await assertFitsSlotCapacity(tx, {
              tourSpots: t.spots,
              tourId: existingReservation.tour_id,
              date: existingReservation.date,
              time: existingReservation.time,
              people: existingReservation.people,
              excludeReservationId: existingReservation.reservation_id,
            });
            if (existingReservation.transfer_id) {
              await assertTransferFreeOnSlot(tx, {
                transferId: existingReservation.transfer_id,
                date: existingReservation.date,
                time: existingReservation.time,
                tourDuration: t.duration,
                excludeReservationId: existingReservation.reservation_id,
              });
            }
          }

          return tx.reservation.update({
            where: { reservation_id: BigInt(reservationId) },
            data,
            include: {
              tour: {
                select: {
                  name: true,
                  type: true,
                  duration: true,
                  supplier_corporate: true,
                },
              },
              transfer: { select: { license_plate: true, make: true, model: true } },
              app_user: { select: { username: true } },
            },
          });
        });

        return NextResponse.json({
          success: true,
          message: "Reserva actualizada exitosamente",
          data: serializeReservationForJSON(
            enrichReservationForApiResponse(
              updatedAsAgent as Parameters<typeof enrichReservationForApiResponse>[0],
            ),
          ),
        });
      }

      if (user.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Solo un administrador puede modificar reservas" },
          { status: 403 },
        );
      }

      // El estado vive en BD solo como cancelación; el resto es calculado al leer.
      const updateData: Record<string, unknown> = { ...body };
      delete updateData.acknowledge_late_cancellation;
      if (body.state == null) {
        delete updateData.state;
      }
      
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

      const mergedStateForAdmin =
        body.state === "cancelled" ? "cancelled" : existingReservation.state;
      const mergedPeople =
        body.people !== undefined ? body.people : existingReservation.people;
      const mergedDate = body.date !== undefined
        ? new Date(body.date)
        : existingReservation.date;
      const mergedTime =
        body.time !== undefined
          ? timeHHMMToTimeDate(body.time)
          : existingReservation.time;
      const mergedTourId =
        body.tour_id !== undefined
          ? BigInt(body.tour_id)
          : existingReservation.tour_id;

      const mergedTransferId: bigint | null =
        body.transfer_id === undefined
          ? existingReservation.transfer_id
          : body.transfer_id == null
            ? null
            : BigInt(body.transfer_id);

      const updatedReservation = await prisma.$transaction(async (tx) => {
        if (mergedStateForAdmin !== "cancelled") {
          const t = await tx.tour.findUnique({ where: { id_tour: mergedTourId } });
          if (!t) {
            throw new Error("TOUR_NOT_FOUND");
          }
          await assertFitsSlotCapacity(tx, {
            tourSpots: t.spots,
            tourId: mergedTourId,
            date: mergedDate,
            time: mergedTime,
            people: mergedPeople,
            excludeReservationId: existingReservation.reservation_id,
          });
          if (mergedTransferId) {
            const trRow = await tx.transfer.findUnique({
              where: { license_plate: mergedTransferId },
            });
            if (!trRow) {
              throw new Error("TRANSFER_NOT_FOUND");
            }
            if (Number(trRow.capacity) < mergedPeople) {
              throw new Error("TRANSFER_CAPACITY_INSUFFICIENT");
            }
            await assertTransferFreeOnSlot(tx, {
              transferId: mergedTransferId,
              date: mergedDate,
              time: mergedTime,
              tourDuration: t.duration,
              excludeReservationId: existingReservation.reservation_id,
            });
          }
        }

        return tx.reservation.update({
          where: { reservation_id: BigInt(reservationId) },
          data: updateData as any,
          include: {
            tour: {
              select: {
                name: true,
                type: true,
                duration: true,
                supplier_corporate: true,
              },
            },
            transfer: { select: { license_plate: true, make: true, model: true } },
            app_user: { select: { username: true } },
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Reserva actualizada exitosamente",
        data: serializeReservationForJSON(
          enrichReservationForApiResponse(
            updatedReservation as Parameters<typeof enrichReservationForApiResponse>[0],
          ),
        ),
      });

    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(createValidationErrorResponse(error), { status: 400 });
      }
      if (error instanceof SlotCapacityError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      if (error instanceof TransferSlotConflictError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      if (error instanceof Error) {
        if (error.message === "TOUR_NOT_FOUND") {
          return NextResponse.json(
            { success: false, error: "El tour de la reserva no existe" },
            { status: 404 },
          );
        }
        if (error.message === "TRANSFER_NOT_FOUND") {
          return NextResponse.json(
            { success: false, error: "El transfer indicado no existe" },
            { status: 404 },
          );
        }
        if (error.message === "TRANSFER_CAPACITY_INSUFFICIENT") {
          return NextResponse.json(
            {
              success: false,
              error:
                "La capacidad del transfer es insuficiente para la cantidad de personas",
            },
            { status: 400 },
          );
        }
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
