import { NextResponse } from "next/server";
import { withAdminAuth, AuthenticatedRequest, AuthenticatedUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ReportQuerySchema } from "@/app/schemas/report.schema";
import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import {
  validarFiltrosParaTipoReporte,
  construirWhereClause,
  calcularKPIsGenerales,
  RESERVATION_REPORT_INCLUDE,
  FiltrosReporte,
  TipoReporte,
  GranularidadTemporal,
} from "@/lib/report-helpers";
import { agregarReservasPorTiempo, agregarReservasPorEstado, agregarReservasPorEmpleado, agregarIngresosPorTiempo, agregarIngresosPorTour,} from "@/lib/report-aggregations";
import { filterReservationsByEffectiveState, isLifecycleListState } from "@/lib/reservation-lifecycle";
import type { Prisma } from "@/generated/prisma";

type ReservationReportRow = Prisma.reservationGetPayload<{
  include: typeof RESERVATION_REPORT_INCLUDE;
}>;

/**
 * Genera el reporte según el tipo especificado.
 *
 * Estados de ciclo de vida (`pending` | `in_progress` | `completed`) dependen de fecha/hora/duración
 * y no se pueden expresar solo con el campo `state` en Prisma. Se resuelven IDs con la misma lógica que
 * `filterReservationsByEffectiveState` y el where final unificado es `reservation_id in (...)`.
 */
async function generarReporte(
  tipoReporte: TipoReporte,
  granularidadTemporal: GranularidadTemporal | undefined,
  filtros: FiltrosReporte,
  pagination: { page: number; limit: number },
) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const whereClause = construirWhereClause(tipoReporte, filtros);

  const estadoParam = filtros.estado;
  const useEffectiveLifecycle =
    estadoParam != null && estadoParam !== "" && isLifecycleListState(estadoParam);

  let total: number;
  let reservationsForMetrics: ReservationReportRow[];
  let reservasPage: ReservationReportRow[];

  if (useEffectiveLifecycle) {
    const minimal = await prisma.reservation.findMany({
      where: whereClause,
      select: {
        reservation_id: true,
        state: true,
        date: true,
        time: true,
        tour: { select: { duration: true } },
      },
      orderBy: { date: "desc" },
    });

    const matched = filterReservationsByEffectiveState(
      minimal as Parameters<typeof filterReservationsByEffectiveState>[0],
      estadoParam,
    );
    const ids: bigint[] = matched.map((r) => r.reservation_id as bigint);
    total = ids.length;

    if (ids.length === 0) {
      reservationsForMetrics = [];
      reservasPage = [];
    } else {
      const whereByIds: Prisma.reservationWhereInput = { reservation_id: { in: ids } };
      const pageIds: bigint[] = ids.slice(skip, skip + limit);
      let fullForKpis: ReservationReportRow[];
      let pageRows: ReservationReportRow[];
      if (pageIds.length === 0) {
        fullForKpis = await prisma.reservation.findMany({
          where: whereByIds,
          include: RESERVATION_REPORT_INCLUDE,
          orderBy: { date: "desc" },
        });
        pageRows = [];
      } else {
        [fullForKpis, pageRows] = await Promise.all([
          prisma.reservation.findMany({
            where: whereByIds,
            include: RESERVATION_REPORT_INCLUDE,
            orderBy: { date: "desc" },
          }),
          prisma.reservation.findMany({
            where: { reservation_id: { in: pageIds } },
            include: RESERVATION_REPORT_INCLUDE,
            orderBy: { date: "desc" },
          }),
        ]);
      }
      reservationsForMetrics = fullForKpis;
      reservasPage = pageRows;
    }
  } else {
    const [count, reservations, pageRows] = await Promise.all([
      prisma.reservation.count({ where: whereClause }),
      prisma.reservation.findMany({
        where: whereClause,
        include: RESERVATION_REPORT_INCLUDE,
        orderBy: { date: "desc" },
      }),
      prisma.reservation.findMany({
        where: whereClause,
        include: RESERVATION_REPORT_INCLUDE,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);
    total = count;
    reservationsForMetrics = reservations;
    reservasPage = pageRows;
  }

  const kpis = calcularKPIsGenerales(reservationsForMetrics);

  let datosGrafico: unknown;

  switch (tipoReporte) {
    case "reservas_tiempo": {
      if (!granularidadTemporal) {
        throw new Error("granularidad_temporal es requerida para reportes de tiempo");
      }
      datosGrafico = agregarReservasPorTiempo(reservationsForMetrics, granularidadTemporal);
      break;
    }
    case "reservas_estado":
      datosGrafico = agregarReservasPorEstado(reservationsForMetrics);
      break;
    case "reservas_empleado":
      datosGrafico = agregarReservasPorEmpleado(reservationsForMetrics);
      break;
    case "ingresos_tiempo": {
      if (!granularidadTemporal) {
        throw new Error("granularidad_temporal es requerida para reportes de tiempo");
      }
      datosGrafico = agregarIngresosPorTiempo(reservationsForMetrics, granularidadTemporal);
      break;
    }
    case "ingresos_tour":
      datosGrafico = agregarIngresosPorTour(reservationsForMetrics);
      break;
    default:
      throw new Error(`Tipo de reporte no reconocido: ${tipoReporte}`);
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    kpis,
    datosGrafico,
    totalReservas: reservationsForMetrics.length,
    reservas: reservasPage,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
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
 * - page: Página (default 1, entero >= 1)
 * - limit: Tamaño de página (default 10, entre 1 y 1000)
 * 
 * La respuesta incluye `pagination`, `reservas` (página), KPIs y gráficos sobre el **mismo** conjunto.
 * Si `estado` es pending | in_progress | completed, el criterio es el **estado efectivo** (fecha/hora/duración);
 * el filtro no cabe en un único `state` de Prisma, así que se unifica el dataset vía `reservation_id in (...)`.
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
        page,
        limit,
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
      const reporte = await generarReporte(tipo_reporte, granularidad_temporal, filtros, {
        page,
        limit,
      });

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
        reservas: reporte.reservas,
        pagination: reporte.pagination,
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
