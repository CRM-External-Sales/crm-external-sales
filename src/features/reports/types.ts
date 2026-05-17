/**
 * Tipos alineados con GET /api/reports → serializeForJSON en el servidor.
 */

export type TipoReporte =
  | "reservas_tiempo"
  | "reservas_estado"
  | "reservas_empleado"
  | "ingresos_tiempo"
  | "ingresos_tour";

export type GranularidadTemporal = "semana" | "mes" | "trimestre" | "año";

export interface ReportKpis {
  total_reservas: number;
  reservas_canceladas: number;
  reservas_no_canceladas: number;
  porcentaje_cancelaciones: number;
  total_ingresos: number;
  total_descuentos: number;
  total_iva: number;
  promedio_reserva: number;
}

export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Fila de `reservas` en la respuesta (relaciones tour / app_user incluidas por el backend). */
export interface ReportReservationRow {
  reservation_id: number;
  tour_id: number;
  employee_user: string;
  hotel_reservation: number;
  state: string;
  note?: string;
  date: string;
  time?: string;
  people: number;
  tour_amount?: number;
  transfer_amount?: number;
  subtotal?: number;
  total: number;
  discount: number;
  iva: number;
  transfer_id: number | null;
  tour?: {
    id_tour: number;
    name: string;
    type: string;
    duration: string;
  } | null;
  app_user?: {
    id: string;
    username: string;
    email: string | null;
  } | null;
}

export interface ReportsData {
  tipo_reporte: TipoReporte;
  granularidad_temporal: GranularidadTemporal | null;
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
  };
  kpis: ReportKpis;
  datosGrafico: unknown;
  totalReservas: number;
  reservas: ReportReservationRow[];
  pagination: ReportPagination;
}

export type ReportsApiResponse =
  | { success: true; data: ReportsData }
  | { success: false; error?: string };

/** Shapes de datosGrafico por tipo (mirroring report-aggregations). */
export interface GraficoReservasTiempo {
  periodo: string;
  cantidad: number;
}

export interface GraficoIngresosTiempo {
  periodo: string;
  ingresos: number;
}

export interface GraficoReservasEstado {
  estado: string;
  cantidad: number;
}

export interface GraficoReservasEmpleado {
  empleado_id: string;
  empleado: string;
  cantidad: number;
}

export interface GraficoIngresosTour {
  tour_id: string;
  tour: string;
  ingresos: number;
}
