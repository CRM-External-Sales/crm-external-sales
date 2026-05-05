"use client";

import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUsdAmount } from "@/lib/format-currency";

import type { ReportPagination, ReportReservationRow } from "../types";

const stateLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  cancelled: "Cancelada",
  completed: "Completada",
};

function formatEstado(state: string): string {
  const key = state?.toLowerCase();
  if (key?.includes("cancel")) return "Cancelada";
  return stateLabels[key] ?? state;
}

function tipoReservaLabel(transferId: number | null): string {
  if (transferId === null) return "Sin transfer";
  return "Con transfer";
}

function formatFecha(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return iso;
  }
}

type Props = {
  rows: ReportReservationRow[];
  pagination: ReportPagination | null;
  /** Tamaño de página solicitado cuando aún no hay respuesta (ej. antes del primer fetch). */
  fallbackLimit: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onLimitChange: (limit: number) => void;
};

export function ReportReservationsTable({
  rows,
  pagination,
  fallbackLimit,
  loading,
  onPrev,
  onNext,
  onLimitChange,
}: Props) {
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? fallbackLimit;
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);
  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  return (
    <div className="rounded-2xl border border-[#C3CEAB] bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-center text-lg font-semibold text-[#2B3418]">Reservas</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#E4E9D8]/90">
              <TableHead className="text-[#3E4C23]">Nº reserva</TableHead>
              <TableHead className="text-[#3E4C23]">Personas</TableHead>
              <TableHead className="text-[#3E4C23]">Tour</TableHead>
              <TableHead className="text-[#3E4C23]">Fecha</TableHead>
              <TableHead className="text-[#3E4C23]">Estado</TableHead>
              <TableHead className="text-[#3E4C23]">Tipo reserva</TableHead>
              <TableHead className="text-[#3E4C23]">Empleado</TableHead>
              <TableHead className="text-right text-[#3E4C23]">Total</TableHead>
              <TableHead className="text-right text-[#3E4C23]">Descuento</TableHead>
              <TableHead className="text-right text-[#3E4C23]">IVA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-[#5a6353]">
                  No hay reservas para esta página.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={String(r.reservation_id)}>
                  <TableCell className="font-medium tabular-nums">
                    {String(r.reservation_id)}
                  </TableCell>
                  <TableCell>{r.people}</TableCell>
                  <TableCell>{r.tour?.name ?? "—"}</TableCell>
                  <TableCell>{formatFecha(r.date)}</TableCell>
                  <TableCell>{formatEstado(r.state)}</TableCell>
                  <TableCell>{tipoReservaLabel(r.transfer_id)}</TableCell>
                  <TableCell>{r.app_user?.username ?? r.employee_user.slice(0, 8)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsdAmount(r.total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsdAmount(r.discount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsdAmount(r.iva)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[#C3CEAB] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#5a6353]">
          {loading
            ? "Cargando…"
            : total === 0
              ? "Sin resultados"
              : `Mostrando ${start}–${end} de ${total} reservas`}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#5a6353]">
            Por página
            <select
              title="Resultados por página"
              className="rounded-md border border-[#C3CEAB] bg-white px-2 py-1.5 text-sm text-[#2B3418]"
              value={limit}
              disabled={loading}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#C3CEAB] bg-white text-[#3E4C23] hover:bg-[#E4E9D8]"
              disabled={loading || !canPrev}
              onClick={onPrev}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#C3CEAB] bg-white text-[#3E4C23] hover:bg-[#E4E9D8]"
              disabled={loading || !canNext}
              onClick={onNext}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
