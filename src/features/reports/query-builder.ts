import type { ReportQueryParams } from "./api";
import type { ReportFilterForm } from "./filter-types";
import { needsGranularidad } from "./filter-types";
import type { TipoReporte } from "./types";

/** Omite query params que el backend rechaza según `tipo_reporte` (ver FILTROS_PROHIBIDOS / FILTROS_PERMITIDOS). */
export function buildReportQuery(
  form: ReportFilterForm,
  page: number,
  limit: number,
): ReportQueryParams {
  const tipo = form.tipo_reporte as TipoReporte;

  const params: ReportQueryParams = {
    tipo_reporte: tipo,
    fecha_inicio: form.fecha_inicio,
    fecha_fin: form.fecha_fin,
    page,
    limit,
  };

  if (needsGranularidad(tipo)) {
    params.granularidad_temporal = form.granularidad_temporal;
  }

  if (tipo !== "reservas_estado" && form.estado) {
    params.estado = form.estado;
  }

  if (tipo !== "reservas_empleado" && form.usuarioId) {
    params.usuarioId = form.usuarioId;
  }

  if (tipo !== "ingresos_tour" && form.tourId) {
    params.tourId = form.tourId;
  }

  if (form.tipo_reserva) {
    params.tipo_reserva = form.tipo_reserva;
  }

  return params;
}
