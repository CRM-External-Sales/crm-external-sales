import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { CreateTourScheduleSchema } from "@/app/schemas/tour.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeTourForJSON } from "@/lib/utils";
import { ZodError } from "zod";

// GET /api/tours/:id/schedules - Listar todos los schedules de un tour
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Verificar que el tour ID sea válido
      if (isNaN(tourId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour inválido",
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

      // Obtener todos los schedules del tour
      const schedules = await prisma.tour_schedule.findMany({
        where: { tour_id: BigInt(tourId) },
        orderBy: [{ weekday: "asc" }, { start_time: "asc" }],
      });

      // Formatear schedules para respuesta (convertir start_time a HH:mm)
      const formattedSchedules = schedules.map((schedule) => ({
        id: Number(schedule.id),
        tour_id: Number(schedule.tour_id),
        weekday: schedule.weekday,
        start_time:
          schedule.start_time instanceof Date
            ? `${String(schedule.start_time.getUTCHours()).padStart(2, "0")}:${String(
                schedule.start_time.getUTCMinutes(),
              ).padStart(2, "0")}`
            : schedule.start_time,
        created_at: schedule.created_at,
      }));

      return NextResponse.json({
        success: true,
        data: formattedSchedules,
      });
    } catch (error) {
      console.error("Error obteniendo schedules:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

// POST /api/tours/:id/schedules - Agregar schedule(s) a un tour (solo admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    // Verificar permisos (solo admin)
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden agregar schedules",
        },
        { status: 403 },
      );
    }

    try {
      // Verificar que el tour ID sea válido
      if (isNaN(tourId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour inválido",
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

      // Parsear body (puede ser un schedule único o un array)
      const body = await authRequest.json();
      let schedulesToCreate: any[] = [];

      if (Array.isArray(body)) {
        // Si es un array, validar cada schedule
        schedulesToCreate = body.map((schedule) =>
          CreateTourScheduleSchema.parse(schedule),
        );
      } else {
        // Si es un objeto único, crear array con un elemento
        schedulesToCreate = [CreateTourScheduleSchema.parse(body)];
      }

      if (schedulesToCreate.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Debe proporcionar al menos un schedule",
          },
          { status: 400 },
        );
      }

      const processedSchedules: any[] = [];

      // Crear cada schedule
      for (const scheduleData of schedulesToCreate) {
        // Convertir start_time de string HH:mm a Date (UTC)
        const [hours, minutes] = scheduleData.start_time.split(":").map(Number);
        const startTimeDate = new Date();
        startTimeDate.setUTCHours(hours, minutes, 0, 0);

        // Crear schedule en la base de datos
        const schedule = await prisma.tour_schedule.create({
          data: {
            tour_id: BigInt(tourId),
            weekday: scheduleData.weekday,
            start_time: startTimeDate,
          },
        });

        processedSchedules.push({
          id: Number(schedule.id),
          tour_id: Number(schedule.tour_id),
          weekday: schedule.weekday,
          start_time: scheduleData.start_time, // Mantener el formato original
          created_at: schedule.created_at,
        });
      }

      // Log de auditoría
      console.log(`Schedules agregados al tour ${tourId} por admin ${user.username}:`, {
        schedulesCount: processedSchedules.length,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          message: `${processedSchedules.length} schedule(s) agregado(s) exitosamente`,
          data: processedSchedules,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Error agregando schedules:", error);

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
