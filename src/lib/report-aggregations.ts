import { Decimal } from "@prisma/client/runtime/library";
import {
  GranularidadTemporal,
  isReservationCancelledForReports,
} from "./report-helpers";
import { computeEffectiveReservationState } from "./reservation-lifecycle";

/**
 * Tipo para reserva con relaciones necesarias para agregaciones
 */
type ReservaConRelaciones = {
  date: Date;
  time: Date;
  state: string;
  total: bigint | number | string | Decimal;
  tour_id: bigint;
  tour?: {
    id_tour: bigint;
    name: string;
    duration?: string;
  };
  employee_user: string;
  app_user?: {
    id: string;
    username: string;
  };
};

/**
 * Obtiene la clave de período según la granularidad temporal
 */
function obtenerPeriodoKey(fecha: Date, granularidad: GranularidadTemporal): string {
  const date = new Date(fecha);
  
  switch (granularidad) {
    case "semana": {
      // ISO Week: YYYY-W## (ej: 2024-W01)
      const year = date.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return `${year}-W${week.toString().padStart(2, "0")}`;
    }
    case "mes": {
      // YYYY-MM (ej: 2024-01)
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      return `${year}-${month}`;
    }
    case "trimestre": {
      // YYYY-T# (ej: 2024-T1)
      const year = date.getFullYear();
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${year}-T${quarter}`;
    }
    case "año": {
      // YYYY (ej: 2024)
      return date.getFullYear().toString();
    }
    default:
      return date.toISOString().split("T")[0];
  }
}

/**
 * Datos del gráfico para reporte: Reservas en el tiempo
 */
export interface DatosGraficoReservasTiempo {
  periodo: string;
  cantidad: number;
}

/**
 * Agrega datos para reporte: Reservas en el tiempo
 * X: fecha agrupada, Y: cantidad de reservas
 */
export function agregarReservasPorTiempo(
  reservas: ReservaConRelaciones[],
  granularidad: GranularidadTemporal,
): DatosGraficoReservasTiempo[] {
  const mapPeriodos = new Map<string, number>();

  reservas.forEach((reserva) => {
    const periodo = obtenerPeriodoKey(reserva.date, granularidad);
    mapPeriodos.set(periodo, (mapPeriodos.get(periodo) || 0) + 1);
  });

  return Array.from(mapPeriodos.entries())
    .map(([periodo, cantidad]) => ({ periodo, cantidad }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

/**
 * Datos del gráfico para reporte: Reservas por estado
 */
export interface DatosGraficoReservasEstado {
  estado: string;
  cantidad: number;
}

/**
 * Agrega datos para reporte: Reservas por estado
 * X: estado, Y: cantidad de reservas
 */
export function agregarReservasPorEstado(
  reservas: ReservaConRelaciones[],
): DatosGraficoReservasEstado[] {
  const mapEstados = new Map<string, number>();

  reservas.forEach((reserva) => {
    const estado = computeEffectiveReservationState(
      {
        state: reserva.state,
        date: reserva.date,
        time: reserva.time,
      },
      reserva.tour?.duration,
    );
    mapEstados.set(estado, (mapEstados.get(estado) || 0) + 1);
  });

  return Array.from(mapEstados.entries())
    .map(([estado, cantidad]) => ({ estado, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente
}

/**
 * Datos del gráfico para reporte: Reservas por empleado
 */
export interface DatosGraficoReservasEmpleado {
  empleado_id: string;
  empleado: string;
  cantidad: number;
}

/**
 * Agrega datos para reporte: Reservas por empleado
 * X: empleado, Y: cantidad de reservas
 */
export function agregarReservasPorEmpleado(
  reservas: ReservaConRelaciones[],
): DatosGraficoReservasEmpleado[] {
  const mapEmpleados = new Map<
    string,
    { empleado_id: string; empleado: string; cantidad: number }
  >();

  reservas.forEach((reserva) => {
    const userId = reserva.employee_user;
    const username = reserva.app_user?.username || userId;

    const existing = mapEmpleados.get(userId);
    if (existing) {
      existing.cantidad += 1;
    } else {
      mapEmpleados.set(userId, {
        empleado_id: userId,
        empleado: username,
        cantidad: 1,
      });
    }
  });

  return Array.from(mapEmpleados.values())
    .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente
}

/**
 * Datos del gráfico para reporte: Ingresos en el tiempo
 */
export interface DatosGraficoIngresosTiempo {
  periodo: string;
  ingresos: number;
}

/**
 * Agrega datos para reporte: Ingresos en el tiempo
 * X: fecha agrupada, Y: suma(total)
 */
export function agregarIngresosPorTiempo(
  reservas: ReservaConRelaciones[],
  granularidad: GranularidadTemporal,
): DatosGraficoIngresosTiempo[] {
  const mapPeriodos = new Map<string, number>();

  const reservasFinancieras = reservas.filter(
    (r) => !isReservationCancelledForReports(r.state),
  );

  reservasFinancieras.forEach((reserva) => {
    const periodo = obtenerPeriodoKey(reserva.date, granularidad);
    const total = Number(reserva.total);
    mapPeriodos.set(periodo, (mapPeriodos.get(periodo) || 0) + total);
  });

  return Array.from(mapPeriodos.entries())
    .map(([periodo, ingresos]) => ({ periodo, ingresos: Number(ingresos.toFixed(2)) }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

/**
 * Datos del gráfico para reporte: Ingresos por tour
 */
export interface DatosGraficoIngresosTour {
  tour_id: string;
  tour: string;
  ingresos: number;
}

/**
 * Agrega datos para reporte: Ingresos por tour
 * X: tour, Y: suma(total)
 */
export function agregarIngresosPorTour(
  reservas: ReservaConRelaciones[],
): DatosGraficoIngresosTour[] {
  const mapTours = new Map<
    bigint,
    { tour_id: bigint; tour: string; ingresos: number }
  >();

  const reservasFinancieras = reservas.filter(
    (r) => !isReservationCancelledForReports(r.state),
  );

  reservasFinancieras.forEach((reserva) => {
    const tourId = reserva.tour_id;
    const tourName = reserva.tour?.name || `Tour ${tourId.toString()}`;
    const total = Number(reserva.total);

    const existing = mapTours.get(tourId);
    if (existing) {
      existing.ingresos += total;
    } else {
      mapTours.set(tourId, {
        tour_id: tourId,
        tour: tourName,
        ingresos: total,
      });
    }
  });

  return Array.from(mapTours.values())
    .map((tour) => ({
      tour_id: tour.tour_id.toString(),
      tour: tour.tour,
      ingresos: Number(tour.ingresos.toFixed(2)),
    }))
    .sort((a, b) => b.ingresos - a.ingresos); // Ordenar por ingresos descendente
}
