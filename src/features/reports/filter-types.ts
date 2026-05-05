import type { GranularidadTemporal, TipoReporte } from "./types";

export interface ReportFilterForm {
  tipo_reporte: TipoReporte;
  fecha_inicio: string;
  fecha_fin: string;
  granularidad_temporal: GranularidadTemporal;
  tourId: string;
  usuarioId: string;
  estado: string;
  tipo_reserva: string;
}

export function needsGranularidad(tipo: TipoReporte): boolean {
  return tipo === "reservas_tiempo" || tipo === "ingresos_tiempo";
}
