import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth, AuthenticatedRequest, AuthenticatedUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ReportQuerySchema } from "@/app/schemas/report.schema";
import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { createValidationErrorResponse } from "@/lib/error-formatter";

// Función para calcular fechas según el tipo de reporte
function calculateDateRange(
  tipoReporte: string,
  fechaInicio?: string,
  fechaFin?: string,
): { inicio: Date; fin: Date } {
  const now = new Date();
  let inicio: Date;
  let fin: Date = new Date(now);

  if (fechaInicio && fechaFin) {
    // Si se proporcionan fechas personalizadas, usarlas
    inicio = new Date(fechaInicio);
    fin = new Date(fechaFin);
  } else {
    // Calcular según el tipo de reporte
    switch (tipoReporte) {
      case "trimestral":
        inicio = new Date(now);
        inicio.setMonth(now.getMonth() - 3);
        break;
      case "semestral":
        inicio = new Date(now);
        inicio.setMonth(now.getMonth() - 6);
        break;
      case "anual":
        inicio = new Date(now);
        inicio.setFullYear(now.getFullYear() - 1);
        break;
      default:
        // Personalizado: último año por defecto
        inicio = new Date(now);
        inicio.setFullYear(now.getFullYear() - 1);
    }
  }

  // Asegurar que fin sea el final del día
  fin.setHours(23, 59, 59, 999);
  inicio.setHours(0, 0, 0, 0);

  return { inicio, fin };
}

// Función para registrar auditoría
async function logReportAccess(
  userId: string,
  filters: Record<string, unknown>,
): Promise<void> {
  try {
    // Registrar en consola
    console.log("Report Access Log:", {
      userId,
      timestamp: new Date().toISOString(),
      filters,
    });
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
}

// GET /api/reports - Get reports with aggregated metrics
// RF-RP5: Only users with administrator role can generate, view and export reports
export const GET = withAdminAuth(
  async (request: AuthenticatedRequest, user: AuthenticatedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());

      // Validar query params
      const validatedQuery = ReportQuerySchema.parse(queryParams);
      const {
        fecha_inicio,
        fecha_fin,
        tipo_reporte,
        tourId,
        usuarioId,
        estado,
        limit,
      } = validatedQuery;

      // Calcular rango de fechas
      const { inicio, fin } = calculateDateRange(
        tipo_reporte || "personalizado",
        fecha_inicio,
        fecha_fin,
      );

      // Construir filtros base
      //Solo admin puede acceder, por lo que puede ver todas las reservas
      const baseWhere: Record<string, unknown> = {
        date: {
          gte: inicio,
          lte: fin,
        },
      };

      // Aplicar filtros adicionales
      if (tourId) {
        baseWhere.tour_id = tourId;
      }

      if (usuarioId) {
        // Admin puede filtrar por cualquier usuario
        baseWhere.employee_user = usuarioId;
      }

      if (estado) {
        baseWhere.state = estado;
      }

      // Obtener todas las reservas que cumplen los filtros
      const reservations = await prisma.reservation.findMany({
        where: baseWhere,
        include: {
          tour: {
            select: {
              id_tour: true,
              name: true,
              type: true,
            },
          },
          app_user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        take: limit,
        orderBy: {
          date: "desc",
        },
      });

      // Si no hay reservas, retornar estructura vacía
      if (reservations.length === 0) {
        return NextResponse.json(
          {
            success: true,
            data: {
              periodo: {
                fecha_inicio: inicio.toISOString(),
                fecha_fin: fin.toISOString(),
                tipo_reporte: tipo_reporte || "personalizado",
              },
              metricas: {
                total_reservas: 0,
                reservas_canceladas: 0,
                reservas_no_canceladas: 0,
                total_ingresos: 0,
                total_descuentos: 0,
                total_iva: 0,
                promedio_reserva: 0,
              },
              tours_mas_solicitados: [],
              tours_menos_solicitados: [],
              clientes_recurrentes: [],
              reservas_detalladas: [],
            },
            message: "No se encontraron reservas para el período seleccionado",
          },
          { status: 200 },
        );
      }

      // Calcular métricas agregadas
      const totalReservas = reservations.length;
      const reservasCanceladas = reservations.filter(
        (r) => r.state.toLowerCase().includes("cancel") || r.state.toLowerCase() === "cancelada",
      ).length;
      const reservasNoCanceladas = totalReservas - reservasCanceladas;

      // Calcular totales financieros
      const totalIngresos = reservations.reduce(
        (sum, r) => sum + Number(r.total),
        0,
      );
      const totalDescuentos = reservations.reduce(
        (sum, r) => sum + Number(r.discount),
        0,
      );
      const totalIva = reservations.reduce(
        (sum, r) => sum + Number(r.iva),
        0,
      );
      const promedioReserva = totalReservas > 0 ? totalIngresos / totalReservas : 0;

      // Tours más y menos solicitados
      const tourCounts = new Map<
        bigint,
        {
          tour_id: bigint;
          nombre_tour: string;
          tipo_tour: string;
          cantidad_reservas: number;
          ingresos_totales: number;
        }
      >();

      reservations.forEach((reservation) => {
        const tourId = reservation.tour_id;
        const existing = tourCounts.get(tourId);

        if (existing) {
          existing.cantidad_reservas += 1;
          existing.ingresos_totales += Number(reservation.total);
        } else {
          tourCounts.set(tourId, {
            tour_id: tourId,
            nombre_tour: reservation.tour.name,
            tipo_tour: reservation.tour.type,
            cantidad_reservas: 1,
            ingresos_totales: Number(reservation.total),
          });
        }
      });

      const toursArray = Array.from(tourCounts.values());
      const toursMasSolicitados = toursArray
        .sort((a, b) => b.cantidad_reservas - a.cantidad_reservas)
        .slice(0, 10)
        .map((tour) => ({
          ...tour,
          tour_id: tour.tour_id.toString(),
          ingresos_totales: Number(tour.ingresos_totales),
        }));

      const toursMenosSolicitados = toursArray
        .sort((a, b) => a.cantidad_reservas - b.cantidad_reservas)
        .slice(0, 10)
        .map((tour) => ({
          ...tour,
          tour_id: tour.tour_id.toString(),
          ingresos_totales: Number(tour.ingresos_totales),
        }));

      // Clientes recurrentes (más de una reserva)
      const clientCounts = new Map<
        string,
        {
          usuario_id: string;
          username: string;
          email: string | null;
          cantidad_reservas: number;
          total_gastado: number;
        }
      >();

      reservations.forEach((reservation) => {
        const userId = reservation.employee_user;
        const existing = clientCounts.get(userId);

        if (existing) {
          existing.cantidad_reservas += 1;
          existing.total_gastado += Number(reservation.total);
        } else {
          clientCounts.set(userId, {
            usuario_id: userId,
            username: reservation.app_user.username,
            email: reservation.app_user.email,
            cantidad_reservas: 1,
            total_gastado: Number(reservation.total),
          });
        }
      });

      const clientesRecurrentes = Array.from(clientCounts.values())
        .filter((client) => client.cantidad_reservas > 1)
        .sort((a, b) => b.cantidad_reservas - a.cantidad_reservas)
        .slice(0, 20)
        .map((client) => ({
          ...client,
          total_gastado: Number(client.total_gastado),
        }));

      // Preparar reservas detalladas para el frontend
      const reservasDetalladas = reservations.map((r) => ({
        reservation_id: r.reservation_id.toString(),
        fecha: r.date.toISOString(),
        hora: r.time.toString(),
        tour: {
          id: r.tour.id_tour.toString(),
          nombre: r.tour.name,
          tipo: r.tour.type,
        },
        usuario: {
          id: r.app_user.id,
          username: r.app_user.username,
          email: r.app_user.email,
        },
        estado: r.state,
        personas: r.people,
        total: Number(r.total),
        subtotal: Number(r.subtotal),
        iva: Number(r.iva),
        descuento: Number(r.discount),
        created_at: r.created_at.toISOString(),
      }));

      // Registrar auditoría
      await logReportAccess(user.id, {
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString(),
        tipo_reporte,
        tourId: tourId?.toString(),
        usuarioId,
        estado,
      });

      // Construir respuesta
      const responseData = {
        periodo: {
          fecha_inicio: inicio.toISOString(),
          fecha_fin: fin.toISOString(),
          tipo_reporte: tipo_reporte || "personalizado",
        },
        metricas: {
          total_reservas: totalReservas,
          reservas_canceladas: reservasCanceladas,
          reservas_no_canceladas: reservasNoCanceladas,
          total_ingresos: Number(totalIngresos.toFixed(2)),
          total_descuentos: Number(totalDescuentos.toFixed(2)),
          total_iva: Number(totalIva.toFixed(2)),
          promedio_reserva: Number(promedioReserva.toFixed(2)),
        },
        tours_mas_solicitados: toursMasSolicitados,
        tours_menos_solicitados: toursMenosSolicitados,
        clientes_recurrentes: clientesRecurrentes,
        reservas_detalladas: reservasDetalladas,
      };

      // Serializar para asegurar que BigInt y otros tipos se conviertan correctamente
      const serializedResponse = serializeForJSON(responseData);

      return NextResponse.json(
        {
          success: true,
          data: serializedResponse,
        },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error generando reporte:", error);

      // Manejar errores de validación
      if (error instanceof ZodError) {
        return NextResponse.json(
          createValidationErrorResponse(error),
          { status: 400 },
        );
      }

      // Manejar otros errores
      return NextResponse.json(
        {
          success: false,
          error: "Error interno del servidor al generar el reporte",
        },
        { status: 500 },
      );
    }
  },
);





