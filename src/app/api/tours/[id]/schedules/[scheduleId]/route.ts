import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateTourScheduleSchema, type UpdateTourScheduleInput } from "@/app/schemas/tour.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeTourForJSON } from "@/lib/utils";
import { ZodError } from "zod";

// PUT /api/tours/:id/schedules/:scheduleId - Actualizar schedule (solo admin)
export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; scheduleId: string }>
      | { id: string; scheduleId: string };
  },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);
  const scheduleId = parseInt(resolvedParams.scheduleId);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    // Verificar permisos (solo admin)
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden actualizar schedules",
        },
        { status: 403 },
      );
    }

    try {
      // Verificar IDs válidos
      if (isNaN(tourId) || isNaN(scheduleId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour o schedule inválido",
          },
          { status: 400 },
        );
      }

      // Verificar que el tour existe
      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
        select: { id_tour: true },
      });

      if (!tour) {
        return NextResponse.json(
          {
            success: false,
            error: "Tour no encontrado",
          },
          { status: 404 },
        );
      }

      // Verificar que el schedule existe y pertenece al tour
      const existingSchedule = await prisma.tour_schedule.findFirst({
        where: {
          id: BigInt(scheduleId),
          tour_id: BigInt(tourId),
        },
      });

      if (!existingSchedule) {
        return NextResponse.json(
          {
            success: false,
            error: "Schedule no encontrado o no pertenece al tour",
          },
          { status: 404 },
        );
      }

      // Parsear y validar body
      const body = await authRequest.json();
      const validatedData = UpdateTourScheduleSchema.parse(body);

      // Preparar datos para actualización (para Prisma, start_time debe ser Date)
      const updateData: {
        weekday?: string;
        start_time?: Date;
      } = {};

      if (validatedData.weekday !== undefined) {
        updateData.weekday = validatedData.weekday;
      }

      if (validatedData.start_time !== undefined) {
        // Convertir start_time de string HH:mm a Date (UTC)
        const [hours, minutes] = validatedData.start_time.split(":").map(Number);
        const startTimeDate = new Date();
        startTimeDate.setUTCHours(hours, minutes, 0, 0);
        updateData.start_time = startTimeDate;
      }

      // Si no hay nada que actualizar
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No se proporcionaron datos para actualizar",
          },
          { status: 400 },
        );
      }

      // Actualizar el schedule
      const updatedSchedule = await prisma.tour_schedule.update({
        where: { id: BigInt(scheduleId) },
        data: updateData,
      });

      // Formatear start_time para respuesta
      const formattedStartTime =
        updatedSchedule.start_time instanceof Date
          ? `${String(updatedSchedule.start_time.getUTCHours()).padStart(2, "0")}:${String(
              updatedSchedule.start_time.getUTCMinutes(),
            ).padStart(2, "0")}`
          : updatedSchedule.start_time;

      // Log de auditoría
      console.log(`Schedule actualizado por admin ${user.username}:`, {
        tourId,
        scheduleId,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Schedule actualizado exitosamente",
        data: {
          id: Number(updatedSchedule.id),
          tour_id: Number(updatedSchedule.tour_id),
          weekday: updatedSchedule.weekday,
          start_time: formattedStartTime,
          created_at: updatedSchedule.created_at,
        },
      });
    } catch (error) {
      console.error("Error actualizando schedule:", error);

      if (error instanceof ZodError) {
        return NextResponse.json(createValidationErrorResponse(error), {
          status: 400,
        });
      }

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

// DELETE /api/tours/:id/schedules/:scheduleId - Eliminar schedule (solo admin)
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; scheduleId: string }>
      | { id: string; scheduleId: string };
  },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);
  const scheduleId = parseInt(resolvedParams.scheduleId);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    // Verificar permisos (solo admin)
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden eliminar schedules",
        },
        { status: 403 },
      );
    }

    try {
      // Verificar IDs válidos
      if (isNaN(tourId) || isNaN(scheduleId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour o schedule inválido",
          },
          { status: 400 },
        );
      }

      // Verificar que el tour existe
      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
        select: { id_tour: true },
      });

      if (!tour) {
        return NextResponse.json(
          {
            success: false,
            error: "Tour no encontrado",
          },
          { status: 404 },
        );
      }

      // Verificar que el schedule existe y pertenece al tour
      const existingSchedule = await prisma.tour_schedule.findFirst({
        where: {
          id: BigInt(scheduleId),
          tour_id: BigInt(tourId),
        },
      });

      if (!existingSchedule) {
        return NextResponse.json(
          {
            success: false,
            error: "Schedule no encontrado o no pertenece al tour",
          },
          { status: 404 },
        );
      }

      // Eliminar el schedule (cascade se encarga automáticamente)
      await prisma.tour_schedule.delete({
        where: { id: BigInt(scheduleId) },
      });

      // Log de auditoría
      console.log(`Schedule eliminado por admin ${user.username}:`, {
        tourId,
        scheduleId,
        weekday: existingSchedule.weekday,
        start_time: existingSchedule.start_time,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Schedule eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando schedule:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}
