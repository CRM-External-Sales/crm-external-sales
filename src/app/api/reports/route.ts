import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth, AuthenticatedRequest, AuthenticatedUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ReportQuerySchema } from "@/app/schemas/report.schema";
import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { validarFiltrosParaTipoReporte, construirWhereClause, calcularKPIsGenerales, FiltrosReporte, TipoReporte, GranularidadTemporal,} from "@/lib/report-helpers";
import { agregarReservasPorTiempo, agregarReservasPorEstado, agregarReservasPorEmpleado, agregarIngresosPorTiempo, agregarIngresosPorTour,} from "@/lib/report-aggregations";
import { filterReservationsByEffectiveState, isLifecycleListState } from "@/lib/reservation-lifecycle";

/**
 * Genera el reporte según el tipo especificado
 * 
 * @param tipoReporte - Tipo de reporte a generar
 * @param granularidadTemporal - Granularidad para reportes de tiempo (semana, mes, trimestre, año)
 * @param filtros - Filtros aplicados al reporte
 * @returns Objeto con KPIs, datos del gráfico y reservas
 */
async function generarReporte(
  tipoReporte: TipoReporte,
  granularidadTemporal: GranularidadTemporal | undefined,
  filtros: FiltrosReporte,
) {
  // Construir WHERE clause según filtros permitidos
  const whereClause = construirWhereClause(tipoReporte, filtros);

  // Obtener reservas con relaciones necesarias
  let reservations = await prisma.reservation.findMany({
    where: whereClause,
    include: {
      tour: {
        select: {
          id_tour: true,
          name: true,
          type: true,
          duration: true,
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
    orderBy: {
      date: "desc",
    },
  });

  if (
    filtros.estado != null &&
    filtros.estado !== "" &&
    isLifecycleListState(filtros.estado)
  ) {
    reservations = filterReservationsByEffectiveState(
      reservations as Parameters<typeof filterReservationsByEffectiveState>[0],
      filtros.estado,
    ) as typeof reservations;
  }

  //KPIs generales
  const kpis = calcularKPIsGenerales(reservations);

  //Datos del gráfico según el tipo de reporte
  let datosGrafico: unknown;

  switch (tipoReporte) {
    case "reservas_tiempo": {
      if (!granularidadTemporal) {
        throw new Error("granularidad_temporal es requerida para reportes de tiempo");
      }
      datosGrafico = agregarReservasPorTiempo(reservations, granularidadTemporal);
      break;
    }
    case "reservas_estado":
      datosGrafico = agregarReservasPorEstado(reservations);
      break;
    case "reservas_empleado":
      datosGrafico = agregarReservasPorEmpleado(reservations);
      break;
    case "ingresos_tiempo": {
      if (!granularidadTemporal) {
        throw new Error("granularidad_temporal es requerida para reportes de tiempo");
      }
      datosGrafico = agregarIngresosPorTiempo(reservations, granularidadTemporal);
      break;
    }
    case "ingresos_tour":
      datosGrafico = agregarIngresosPorTour(reservations);
      break;
    default:
      throw new Error(`Tipo de reporte no reconocido: ${tipoReporte}`);
  }

  return {
    kpis,
    datosGrafico,
    totalReservas: reservations.length,
  };
}

/**
 * Registra el acceso al reporte para auditoría
 */
async function logReportAccess(
  userId: string,
  filters: Record<string, unknown>,
): Promise<void> {
  try {
    console.log("Report Access Log:", {
      userId,
      timestamp: new Date().toISOString(),
      filters,
    });
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
}

/**
 * GET /api/reports
 * 
 * Genera reportes dinámicos según el tipo especificado.
 * 
 * Query Parameters:
 * - tipo_reporte: Tipo de reporte (reservas_tiempo, reservas_estado, reservas_empleado, ingresos_tiempo, ingresos_tour)
 * - granularidad_temporal: Solo para reportes de tiempo (semana, mes, trimestre, año)
 * - fecha_inicio: Fecha de inicio (obligatorio, formato ISO)
 * - fecha_fin: Fecha de fin (obligatorio, formato ISO)
 * - tourId: ID del tour (opcional, según tipo de reporte)
 * - usuarioId: ID del empleado (opcional, según tipo de reporte)
 * - estado: Estado de la reserva (opcional, según tipo de reporte)
 * - tipo_reserva: Tipo de reserva (con_transfer, sin_transfer) (opcional)
 * 
 * RF-RP5: Only users with administrator role can generate, view and export reports
 */
export const GET = withAdminAuth(
  async (request: AuthenticatedRequest, user: AuthenticatedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());

      // 1. Validar query params con Zod
      let validatedQuery;
      try {
        validatedQuery = ReportQuerySchema.parse(queryParams);
      } catch (error) {
        if (error instanceof ZodError) {
          return NextResponse.json(
            createValidationErrorResponse(error),
            { status: 400 },
          );
        }
        throw error;
      }

      const {
        tipo_reporte,
        granularidad_temporal,
        fecha_inicio,
        fecha_fin,
        tourId,
        usuarioId,
        estado,
        tipo_reserva,
      } = validatedQuery;

      // 2. Preparar objeto de filtros
      const filtros: FiltrosReporte = {
        fecha_inicio,
        fecha_fin,
        tourId,
        usuarioId,
        estado,
        tipo_reserva,
      };

      // 3. Validar filtros según el tipo de reporte
      const validacionFiltros = validarFiltrosParaTipoReporte(tipo_reporte, filtros);
      if (!validacionFiltros.valido) {
        return NextResponse.json(
          {
            success: false,
            error: validacionFiltros.error || "Filtros inválidos para el tipo de reporte",
          },
          { status: 400 },
        );
      }

      // 4. Validar granularidad temporal si es requerida
      if ((tipo_reporte === "reservas_tiempo" || tipo_reporte === "ingresos_tiempo") && !granularidad_temporal) {
        return NextResponse.json(
          {
            success: false,
            error: "granularidad_temporal es requerida para reportes de tiempo",
          },
          { status: 400 },
        );
      }

      // 5. Generar el reporte
      const reporte = await generarReporte(tipo_reporte, granularidad_temporal, filtros);

      // 6. Preparar fechas para la respuesta 
      const inicio = new Date(filtros.fecha_inicio + 'T00:00:00.000Z');
      const fin = new Date(filtros.fecha_fin + 'T23:59:59.999Z');

      // Registrar auditoría
      await logReportAccess(user.id, {
        tipo_reporte,
        granularidad_temporal,
        ...filtros,
      });

      // Construir respuesta final
      const responseData = {
        tipo_reporte,
        granularidad_temporal: granularidad_temporal || null,
        periodo: {
          fecha_inicio: inicio.toISOString(),
          fecha_fin: fin.toISOString(),
        },
        kpis: reporte.kpis,
        datosGrafico: reporte.datosGrafico,
        totalReservas: reporte.totalReservas,
      };

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

      // Manejar errores de validación de Zod
      if (error instanceof ZodError) {
        return NextResponse.json(
          createValidationErrorResponse(error),
          { status: 400 },
        );
      }

      // Manejar errores de validación de filtros
      if (error instanceof Error && error.message.includes("requerida")) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
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
