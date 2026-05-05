import { http } from "@/lib/axios";

import type { ReportsApiResponse } from "./types";

export type ReportQueryParams = {
  tipo_reporte: string;
  fecha_inicio: string;
  fecha_fin: string;
  granularidad_temporal?: string;
  tourId?: string;
  usuarioId?: string;
  estado?: string;
  tipo_reserva?: string;
  page: number;
  limit: number;
};

function toQueryRecord(params: ReportQueryParams): Record<string, string> {
  const out: Record<string, string> = {
    tipo_reporte: params.tipo_reporte,
    fecha_inicio: params.fecha_inicio,
    fecha_fin: params.fecha_fin,
    page: String(params.page),
    limit: String(params.limit),
  };
  if (params.granularidad_temporal) {
    out.granularidad_temporal = params.granularidad_temporal;
  }
  if (params.tourId) out.tourId = params.tourId;
  if (params.usuarioId) out.usuarioId = params.usuarioId;
  if (params.estado) out.estado = params.estado;
  if (params.tipo_reserva) out.tipo_reserva = params.tipo_reserva;
  return out;
}

export async function fetchReports(
  params: ReportQueryParams,
): Promise<ReportsApiResponse> {
  const res = await http.get<ReportsApiResponse>("/reports", {
    params: toQueryRecord(params),
  });
  return res.data;
}
