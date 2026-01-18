import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";

/**
 * Tipos de reporte disponibles
 */
export type TipoReporte =
  | "reservas_tiempo"
  | "reservas_estado"
  | "reservas_empleado"
  | "ingresos_tiempo"
  | "ingresos_tour";

/**
 * Granularidades temporales para reportes de tiempo
 */
export type GranularidadTemporal = "semana" | "mes" | "trimestre" | "año";

/**
 * Filtros disponibles para reportes
 */
export interface FiltrosReporte {
  fecha_inicio: string;
  fecha_fin: string;
  tourId?: bigint;
  usuarioId?: string;
  estado?: string;
  tipo_reserva?: "con_transfer" | "sin_transfer";
}

/**
 * Configuración de filtros permitidos por tipo de reporte
 */
const FILTROS_PERMITIDOS: Record<TipoReporte, (keyof FiltrosReporte)[]> = {
  reservas_tiempo: ["fecha_inicio", "fecha_fin", "estado", "tourId", "usuarioId"],
  reservas_estado: ["fecha_inicio", "fecha_fin", "tourId", "usuarioId"],
  reservas_empleado: ["fecha_inicio", "fecha_fin", "estado", "tourId"],
  ingresos_tiempo: ["fecha_inicio", "fecha_fin", "estado", "tourId", "usuarioId"],
  ingresos_tour: ["fecha_inicio", "fecha_fin", "estado"],
};

/**
 * Filtros que NO están permitidos por tipo de reporte
 */
const FILTROS_PROHIBIDOS: Record<TipoReporte, (keyof FiltrosReporte)[]> = {
  reservas_tiempo: [], // Todos los filtros permitidos están en FILTROS_PERMITIDOS
  reservas_estado: ["estado"], // No se puede filtrar por estado en reporte de estados
  reservas_empleado: ["usuarioId"], // No se puede filtrar por empleado en reporte de empleados
  ingresos_tiempo: [],
  ingresos_tour: ["tourId"], // No se puede filtrar por tour en reporte de tours
};

/**
 * Valida que los filtros proporcionados sean válidos para el tipo de reporte
 */
export function validarFiltrosParaTipoReporte(
  tipoReporte: TipoReporte,
  filtros: FiltrosReporte,
): { valido: boolean; error?: string } {
  // Validar que fecha_inicio y fecha_fin estén presentes (obligatorios)
  if (!filtros.fecha_inicio || !filtros.fecha_fin) {
    return {
      valido: false,
      error: "fecha_inicio y fecha_fin son obligatorios para todos los reportes",
    };
  }

  // Validar que fecha_inicio <= fecha_fin
  const inicio = new Date(filtros.fecha_inicio);
  const fin = new Date(filtros.fecha_fin);
  if (inicio > fin) {
    return {
      valido: false,
      error: "fecha_inicio debe ser menor o igual a fecha_fin",
    };
  }

  // Validar que no se usen filtros prohibidos
  const filtrosProhibidos = FILTROS_PROHIBIDOS[tipoReporte];
  for (const filtroProhibido of filtrosProhibidos) {
    if (filtros[filtroProhibido] !== undefined) {
      return {
        valido: false,
        error: `El filtro '${filtroProhibido}' no está permitido para el tipo de reporte '${tipoReporte}'`,
      };
    }
  }

  // Validar que solo se usen filtros permitidos
  const filtrosPermitidos = FILTROS_PERMITIDOS[tipoReporte];
  const filtrosProporcionados = Object.keys(filtros) as (keyof FiltrosReporte)[];
  
  for (const filtro of filtrosProporcionados) {
    // fecha_inicio y fecha_fin siempre están permitidos
    if (filtro === "fecha_inicio" || filtro === "fecha_fin") {
      continue;
    }
    
    // Si el filtro tiene un valor y no está en la lista de permitidos, es inválido
    if (filtros[filtro] !== undefined && !filtrosPermitidos.includes(filtro)) {
      return {
        valido: false,
        error: `El filtro '${filtro}' no está permitido para el tipo de reporte '${tipoReporte}'`,
      };
    }
  }

  return { valido: true };
}

/**
 * Construye la cláusula WHERE de Prisma según los filtros permitidos
 */
export function construirWhereClause(
  tipoReporte: TipoReporte,
  filtros: FiltrosReporte,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  // Filtro de fechas 
  const fechaInicio = new Date(filtros.fecha_inicio + 'T00:00:00.000Z');
  const fechaFin = new Date(filtros.fecha_fin + 'T23:59:59.999Z');

  where.date = {
    gte: fechaInicio,
    lte: fechaFin,
  };

  // Aplicar filtros permitidos según el tipo de reporte
  const filtrosPermitidos = FILTROS_PERMITIDOS[tipoReporte];

  if (filtrosPermitidos.includes("tourId") && filtros.tourId) {
    where.tour_id = filtros.tourId;
  }

  if (filtrosPermitidos.includes("usuarioId") && filtros.usuarioId) {
    where.employee_user = filtros.usuarioId;
  }

  if (filtrosPermitidos.includes("estado") && filtros.estado) {
    where.state = filtros.estado;
  }

  // Filtro de tipo_reserva (si está permitido y proporcionado)
  if (filtros.tipo_reserva) {
    if (filtros.tipo_reserva === "con_transfer") {
      where.transfer_id = { not: null };
    } else if (filtros.tipo_reserva === "sin_transfer") {
      where.transfer_id = null;
    }
  }

  return where;
}

/**
 * Calcula KPIs generales a partir de las reservas
 */
export interface KPIsGenerales {
  total_reservas: number;
  reservas_canceladas: number;
  reservas_no_canceladas: number;
  porcentaje_cancelaciones: number;
  total_ingresos: number;
  total_descuentos: number;
  total_iva: number;
  promedio_reserva: number;
}

export function calcularKPIsGenerales(
  reservations: Array<{
    state: string;
    total: bigint | number | string | Decimal;
    discount: bigint | number | string | Decimal;
    iva: bigint | number | string | Decimal;
  }>,
): KPIsGenerales {
  const totalReservas = reservations.length;
  
  const reservasCanceladas = reservations.filter(
    (r) => r.state.toLowerCase().includes("cancel") || r.state.toLowerCase() === "cancelada",
  ).length;
  
  const reservasNoCanceladas = totalReservas - reservasCanceladas;
  
  const porcentajeCancelaciones = totalReservas > 0
    ? Number(((reservasCanceladas / totalReservas) * 100).toFixed(2))
    : 0;

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

  return {
    total_reservas: totalReservas,
    reservas_canceladas: reservasCanceladas,
    reservas_no_canceladas: reservasNoCanceladas,
    porcentaje_cancelaciones: porcentajeCancelaciones,
    total_ingresos: Number(totalIngresos.toFixed(2)),
    total_descuentos: Number(totalDescuentos.toFixed(2)),
    total_iva: Number(totalIva.toFixed(2)),
    promedio_reserva: Number(promedioReserva.toFixed(2)),
  };
}
