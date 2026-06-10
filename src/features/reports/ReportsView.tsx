"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTours } from "@/hooks/useTours";
import { useUsers } from "@/hooks/useUsers";
import { isAxiosLikeError } from "@/lib/http-error";

import { fetchReports, type ReportQueryParams } from "./api";
import {
  buildExportBasename,
  downloadReportExcel,
  downloadReportPdf,
  resolveReportForExport,
} from "./export-report";
import { ReportChart } from "./components/ReportChart";
import { ReportFilters } from "./components/ReportFilters";
import { ReportKpis } from "./components/ReportKpis";
import { ReportReservationsTable } from "./components/ReportReservationsTable";
import type { ReportFilterForm } from "./filter-types";
import { useStateDraft } from "@/hooks/useStateDraft";
import { formDraftKeys } from "@/lib/form-draft-keys";
import { needsGranularidad } from "./filter-types";
import { buildReportQuery } from "./query-builder";
import type { ReportsData } from "./types";

function defaultFilters(): ReportFilterForm {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    tipo_reporte: "reservas_tiempo",
    fecha_inicio: start.toISOString().slice(0, 10),
    fecha_fin: end.toISOString().slice(0, 10),
    granularidad_temporal: "mes",
    tourId: "",
    usuarioId: "",
    estado: "",
    tipo_reserva: "",
  };
}

function parseApiError(err: unknown): string {
  if (isAxiosLikeError(err)) {
    const data = err.response?.data as { error?: string; message?: string };
    return data?.error ?? data?.message ?? "Error al cargar el reporte.";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Error desconocido.";
}

export function ReportsView() {
  const [filters, setFilters] = useStateDraft<ReportFilterForm>(
      formDraftKeys.reports.filters,
      defaultFilters,
      { restoreMessage: false },
    );
  const [limit, setLimit] = useState(10);
  const [reportData, setReportData] = useState<ReportsData | null>(null);
  const [activeQuery, setActiveQuery] = useState<ReportQueryParams | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingType, setExportingType] = useState<"excel" | "pdf" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { tours, loading: toursLoading } = useTours({ page: 1, limit: 500 });
  const { users, loading: usersLoading } = useUsers({ page: 1, limit: 500 });

  const runFetch = useCallback(
    async (params: ReportQueryParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchReports(params);
        if (res.success) {
          setReportData(res.data);
          setActiveQuery(params);
        } else {
          const msg = res.error ?? "No se pudo generar el reporte.";
          setError(msg);
          toast.error(msg);
        }
      } catch (e) {
        const msg = parseApiError(e);
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    if (!filters.fecha_inicio || !filters.fecha_fin) {
      toast.error("Indique fecha de inicio y fecha de fin.");
      return;
    }
    if (new Date(filters.fecha_inicio) > new Date(filters.fecha_fin)) {
      toast.error("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    if (needsGranularidad(filters.tipo_reporte) && !filters.granularidad_temporal) {
      toast.error("Seleccione la granularidad temporal.");
      return;
    }
    const params = buildReportQuery(filters, 1, limit);
    void runFetch(params);
  }, [filters, limit, runFetch]);

  const handleClear = useCallback(() => {
    setFilters(defaultFilters());
    setLimit(10);
    setReportData(null);
    setActiveQuery(null);
    setError(null);
  }, []);

  const handlePrev = useCallback(() => {
    if (!activeQuery || activeQuery.page <= 1) return;
    void runFetch({ ...activeQuery, page: activeQuery.page - 1 });
  }, [activeQuery, runFetch]);

  const handleNext = useCallback(() => {
    if (!activeQuery) return;
    const totalPages =
      reportData?.pagination.totalPages ??
      Math.max(1, Math.ceil((reportData?.pagination.total ?? 0) / activeQuery.limit));
    if (activeQuery.page >= totalPages) return;
    void runFetch({ ...activeQuery, page: activeQuery.page + 1 });
  }, [activeQuery, reportData?.pagination, runFetch]);

  const handleLimitChange = useCallback(
    (newLimit: number) => {
      setLimit(newLimit);
      if (!activeQuery) {
        toast.info("Genere un reporte para aplicar el nuevo tamaño de página.");
        return;
      }
      void runFetch({ ...activeQuery, page: 1, limit: newLimit });
    },
    [activeQuery, runFetch],
  );

  const handleExportExcel = useCallback(async () => {
    if (!reportData || !activeQuery) {
      toast.error("Genere un reporte antes de exportar.");
      return;
    }
    setExportingType("excel");
    try {
      const { data, warning } = await resolveReportForExport(reportData, activeQuery);
      await downloadReportExcel(data, buildExportBasename(data));
      toast.success("Excel descargado.");
      if (warning) {
        toast.warning(warning);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setExportingType(null);
    }
  }, [reportData, activeQuery]);

  const handleExportPdf = useCallback(async () => {
    if (!reportData || !activeQuery) {
      toast.error("Genere un reporte antes de exportar.");
      return;
    }
    setExportingType("pdf");
    try {
      const { data, warning } = await resolveReportForExport(reportData, activeQuery);
      downloadReportPdf(data, buildExportBasename(data));
      toast.success("PDF descargado.");
      if (warning) {
        toast.warning(warning);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setExportingType(null);
    }
  }, [reportData, activeQuery]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-center text-2xl font-semibold text-[#2B3418] sm:text-left">
          Reportes
        </h1>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
          <Button
            type="button"
            className="bg-[#607536] text-white hover:bg-[#4F612E] active:bg-[#3E4C23]"
            onClick={() => void handleExportExcel()}
            disabled={exportingType !== null || !reportData}
          >
            {exportingType === "excel" ? "Exportando…" : "Exportar Excel"}
          </Button>
          <Button
            type="button"
            className="bg-[#3E4C23] text-white hover:bg-[#2B3418] active:bg-[#183733]"
            onClick={() => void handleExportPdf()}
            disabled={exportingType !== null || !reportData}
          >
            {exportingType === "pdf" ? "Exportando…" : "Exportar PDF"}
          </Button>
        </div>
      </div>

      <ReportFilters
        values={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onGenerate={handleGenerate}
        onClear={handleClear}
        loading={loading}
        tours={tours}
        users={users}
        toursLoading={toursLoading}
        usersLoading={usersLoading}
      />

      {error && (
        <Alert variant="destructive" className="bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <p className="text-center text-sm text-[#5a6353]">Cargando reporte…</p>
      )}

      <ReportKpis kpis={reportData?.kpis ?? null} />

      <ReportChart
        chartReady={reportData != null}
        tipoReporte={reportData?.tipo_reporte ?? null}
        datosGrafico={reportData?.datosGrafico}
      />

      <ReportReservationsTable
        rows={reportData?.reservas ?? []}
        pagination={reportData?.pagination ?? null}
        fallbackLimit={limit}
        loading={loading}
        onPrev={handlePrev}
        onNext={handleNext}
        onLimitChange={handleLimitChange}
      />
    </div>
  );
}
