import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRole, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  CreateReservationSchema,
  ReservationListQuerySchema,
} from "@/app/schemas/reservation.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma";
import { Decimal } from "@/generated/prisma/runtime/library";
import {
  assertFitsSlotCapacity,
  assertTransferFreeOnSlot,
  SlotCapacityError,
  TransferSlotConflictError,
} from "@/lib/reservation-slot-availability";
import {
  filterReservationsByEffectiveState,
  isLifecycleListState,
  reservationWhereForListStateParam,
} from "@/lib/reservation-lifecycle";
import { enrichReservationForApiResponse } from "@/lib/reservation-cancellation-policy";
import { syncReservationStatesInDatabase } from "@/lib/sync-reservation-db-states";
import { serializeReservationForJSON } from "@/lib/serialize-reservation-for-json";

export const POST = withRole("agent")(async (request: AuthenticatedRequest, user) => {
  try {
    const json = await request.json();
    const body = CreateReservationSchema.parse(json);

    // 1. Preparar objeto Fecha Hora
    const [hours, minutes] = body.time.split(":").map(Number);
    const timeDate = new Date();
    timeDate.setUTCFullYear(1970, 0, 1);
    timeDate.setUTCHours(hours, minutes, 0, 0);

    const ivaRate = new Decimal(body.iva_rate);
    const discountInput = new Decimal(body.discount);

    const result = await prisma.$transaction(async (tx) => {
      const tour = await tx.tour.findUnique({
        where: { id_tour: body.tour_id },
      });

      if (!tour) {
        return { error: "El tour seleccionado no existe" as const, status: 404 as const };
      }

      let transfer = null;
      if (body.transfer_id) {
        transfer = await tx.transfer.findUnique({
          where: { license_plate: body.transfer_id },
        });

        if (!transfer) {
          return { error: "El transfer seleccionado no existe" as const, status: 404 as const };
        }
        if (Number(transfer.capacity) < body.people) {
          return {
            error:
              "La capacidad del transfer es insuficiente para la cantidad de personas de la reserva" as const,
            status: 400 as const,
          };
        }
      }

      const tourPrice = new Decimal(tour.base_price);
      const tourAmount = tourPrice.mul(body.people);
      const transferAmount = transfer
        ? new Decimal(
            body.transfer_amount !== undefined
              ? body.transfer_amount
              : transfer.sale_price,
          )
        : new Decimal(0);
      const subtotal = tourAmount.add(transferAmount);
      const iva = subtotal.mul(ivaRate);
      const discount = discountInput;
      const total = subtotal.add(iva).sub(discount);

      const reservationDate = new Date(body.date);
      await assertFitsSlotCapacity(tx, {
        tourSpots: tour.spots,
        tourId: BigInt(body.tour_id),
        date: reservationDate,
        time: timeDate,
        people: body.people,
      });

      if (body.transfer_id) {
        await assertTransferFreeOnSlot(tx, {
          transferId: BigInt(body.transfer_id),
          date: reservationDate,
          time: timeDate,
          tourDuration: tour.duration,
        });
      }

      const reservation = await tx.reservation.create({
        data: {
          employee_user: user.id,
          tour_id: body.tour_id,
          transfer_id: body.transfer_id,
          hotel_reservation: body.hotel_reservation,
          date: body.date,
          time: timeDate,
          people: body.people,
          state: "pending",
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
              type: true,
              duration: true,
              supplier_corporate: true,
            },
          },
          transfer: {
            select: {
              license_plate: true,
              make: true,
              model: true,
            },
          },
          app_user: {
            select: {
              username: true,
            },
          },
        },
      });

      return { reservation, status: 201 as const };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const created = enrichReservationForApiResponse(
      result.reservation as Parameters<typeof enrichReservationForApiResponse>[0],
    );
    return NextResponse.json(
      {
        success: true,
        data: serializeReservationForJSON(created),
      },
      { status: 201 },
    );

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
    const queryParams = Object.fromEntries(searchParams.entries());
    const listQuery = ReservationListQuerySchema.parse(queryParams);

    const now = new Date();
    await syncReservationStatesInDatabase(now);

    const { page, limit, date, dateFrom, dateTo, state, transfer_id, q: searchQ } =
      listQuery;
    const skip = (page - 1) * limit;

    // Admin y agente: listado global (no filtrar por employee_user).
    const andParts: Prisma.reservationWhereInput[] = [];

    const stateWhere = reservationWhereForListStateParam(state);
    if (stateWhere) {
      andParts.push(stateWhere);
    }

    const hasRange = Boolean(dateFrom?.trim() || dateTo?.trim());
    if (hasRange) {
      const gte = dateFrom?.trim()
        ? (() => {
            const d = new Date(dateFrom!);
            d.setUTCHours(0, 0, 0, 0);
            return d;
          })()
        : undefined;
      const lte = dateTo?.trim()
        ? (() => {
            const d = new Date(dateTo!);
            d.setUTCHours(23, 59, 59, 999);
            return d;
          })()
        : undefined;
      if (gte || lte) {
        andParts.push({
          date: {
            ...(gte ? { gte } : {}),
            ...(lte ? { lte } : {}),
          },
        });
      }
    } else if (date?.trim()) {
      const searchDate = new Date(date);
      if (!isNaN(searchDate.getTime())) {
        const startOfDay = new Date(searchDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(searchDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        andParts.push({
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        });
      }
    }

    if (transfer_id === "__none__") {
      andParts.push({ transfer_id: null });
    } else if (transfer_id?.trim()) {
      const plate = transfer_id.trim();
      if (/^\d+$/.test(plate)) {
        andParts.push({ transfer_id: BigInt(plate) });
      }
    }

    const term = searchQ?.trim();
    if (term) {
      const or: Prisma.reservationWhereInput[] = [
        { tour: { name: { contains: term, mode: "insensitive" } } },
      ];
      if (/^\d+$/.test(term)) {
        try {
          or.push({ reservation_id: BigInt(term) });
        } catch {
          /* placa/ id demasiado grande */
        }
        const asInt = parseInt(term, 10);
        if (!Number.isNaN(asInt) && asInt <= 2147483647) {
          or.push({ hotel_reservation: asInt });
        }
      }
      andParts.push({ OR: or });
    }

    const where: Prisma.reservationWhereInput =
      andParts.length > 0 ? { AND: andParts } : {};

    const include = {
      tour: {
        select: {
          name: true,
          type: true,
          duration: true,
          supplier_corporate: true,
        },
      },
      transfer: {
        select: {
          license_plate: true,
          make: true,
          model: true,
        },
      },
      app_user: {
        select: {
          username: true,
        },
      },
    } as const;

    if (state && isLifecycleListState(state)) {
      const matching = await prisma.reservation.findMany({
        where,
        include,
        orderBy: {
          date: "desc",
        },
      });
      const filtered = filterReservationsByEffectiveState(
        matching as Parameters<typeof filterReservationsByEffectiveState>[0],
        state,
        now,
      );
      const total = filtered.length;
      const sliced = filtered.slice(skip, skip + limit);
      const withState = sliced.map((r) =>
        enrichReservationForApiResponse(
          r as Parameters<typeof enrichReservationForApiResponse>[0],
          now,
        ),
      );
      return NextResponse.json({
        success: true,
        data: serializeReservationForJSON(withState),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        include,
        orderBy: {
          date: "desc",
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    const withState = reservations.map((r) =>
      enrichReservationForApiResponse(
        r as Parameters<typeof enrichReservationForApiResponse>[0],
        now,
      ),
    );

    return NextResponse.json({
      success: true,
      data: serializeReservationForJSON(withState),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Parámetros de consulta inválidos",
          details: error.message,
        },
        { status: 400 },
      );
    }
    console.error("Error obteniendo reservas:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
});
