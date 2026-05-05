"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useReservations } from "@/hooks/useReservations";
import { useTransfers } from "@/hooks/useTransfers";
import { reservationService, type ApiResponse, type Reservation } from "@/lib/api";
import { formatUsdAmount } from "@/lib/format-currency";
import { isAxiosLikeError } from "@/lib/http-error";
import { cn } from "@/lib/utils";

const stateLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  cancelled: "Cancelada",
  completed: "Completada",
};

function stateRowBadgeClass(state: string) {
  if (state === "cancelled") {
    return "bg-gray-100 text-gray-600";
  }
  if (state === "completed") {
    return "bg-green-100 text-green-700";
  }
  if (state === "in_progress") {
    return "bg-sky-100 text-sky-800";
  }
  return "bg-amber-100 text-amber-800";
}

function formatReservationId(id: number | string) {
  const s = String(id);
  return s.length > 10 ? s.slice(0, 8) + "…" : s;
}

function canUserCancelReservation(
  user: { id: string; role: string } | null,
  r: Reservation,
) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "agent" && r.employee_user === user.id) return true;
  return false;
}

const cancelTextareaClass =
  "min-h-[100px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2";

function reservationNeedsLateCancelAck(r: {
  is_within_cancellation_lead: boolean;
  late_cancellation_penalty_usd: number;
}): boolean {
  return (
    r.is_within_cancellation_lead === false &&
    (r.late_cancellation_penalty_usd ?? 0) > 0
  );
}

export const ReservationsListView = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [transferFilter, setTransferFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { transfers } = useTransfers({ page: 1, limit: 100 });

  const { reservations, loading, error, pagination, refetch } = useReservations({
    page: currentPage,
    limit,
    q: debouncedSearchTerm.trim() || undefined,
    state: stateFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    transfer_id: transferFilter || undefined,
  });

  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelStep, setCancelStep] = useState<"confirm" | "reason">("confirm");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [acknowledgeLateCancellation, setAcknowledgeLateCancellation] =
    useState(false);

  const closeCancelDialog = useCallback(() => {
    setCancelTarget(null);
    setCancelStep("confirm");
    setCancelReason("");
    setCancelError(null);
    setCancelSubmitting(false);
    setAcknowledgeLateCancellation(false);
  }, []);

  const onConfirmCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("Debe indicar el motivo de la cancelación.");
      return;
    }
    setCancelSubmitting(true);
    setCancelError(null);
    const needsLateAck = reservationNeedsLateCancelAck({
      is_within_cancellation_lead: cancelTarget.is_within_cancellation_lead,
      late_cancellation_penalty_usd: cancelTarget.late_cancellation_penalty_usd,
    });
    try {
      const res = await reservationService.updateReservation(
        Number(cancelTarget.reservation_id),
        {
          state: "cancelled",
          cancellation_reason: reason,
          ...(needsLateAck
            ? { acknowledge_late_cancellation: true as const }
            : {}),
        },
      );
      if (res.success) {
        toast.success("Reserva cancelada");
        void refetch();
        closeCancelDialog();
      } else {
        setCancelError(res.error || "No se pudo cancelar la reserva.");
      }
    } catch (err) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const d = err.response.data as ApiResponse;
        setCancelError(d.error || d.message || d.details || "Error al cancelar");
      } else {
        setCancelError(
          err instanceof Error ? err.message : "Error al cancelar la reserva.",
        );
      }
    } finally {
      setCancelSubmitting(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, stateFilter, transferFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    debouncedSearchTerm.trim() !== "" ||
    stateFilter !== "" ||
    transferFilter !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <div className="mx-auto w-full max-w-6xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) closeCancelDialog();
        }}
      >
        <AlertDialogContent className="max-w-md border-2 border-[#e5e2dc] bg-[#F2F1ED] shadow-lg sm:rounded-xl">
          {cancelTarget && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-center text-xl font-semibold text-[#2B3418]">
                  {cancelStep === "confirm"
                    ? "Cancelar reserva"
                    : "Motivo de cancelación"}
                </AlertDialogTitle>
              </AlertDialogHeader>

              {cancelStep === "confirm" && (
                <div className="space-y-4">
                  <Alert
                    variant="default"
                    className="border-red-200 bg-red-50 text-left text-red-900"
                  >
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <AlertTitle>¿Seguro que desea cancelar?</AlertTitle>
                        <AlertDescription>
                          Esta acción dejará la reserva en estado{" "}
                          <strong>cancelada</strong>. Puede afectar la disponibilidad
                          del tour para otras reservas.
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                  {reservationNeedsLateCancelAck(cancelTarget) && (
                    <Alert variant="default" className="border-red-200 bg-red-50 text-left text-red-900">
                      <AlertDescription>
                        {cancelTarget.late_cancellation_notice ??
                          "Anulación fuera del plazo mínimo: aplica penalidad. El cobro con el cliente queda a cargo del agente fuera de esta plataforma."}
                      </AlertDescription>
                    </Alert>
                  )}
                  {reservationNeedsLateCancelAck(cancelTarget) && (
                    <div className="flex items-start gap-2 text-left text-sm text-[#4A4A4A]">
                      <input
                        id="ack-late-lst"
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
                        checked={acknowledgeLateCancellation}
                        onChange={(e) =>
                          setAcknowledgeLateCancellation(e.target.checked)
                        }
                      />
                      <label htmlFor="ack-late-lst" className="leading-snug">
                        Confirmo que informé al cliente la penalidad y que el cobro se
                        coordina con el cliente por aparte.
                      </label>
                    </div>
                  )}
                  <p className="text-sm text-[#4A4A4A]">
                    <span className="font-medium">Tour: </span>
                    {cancelTarget.tour?.name ?? "—"}
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-2 border-[#313833] bg-transparent text-[#313833] hover:bg-transparent hover:opacity-80"
                      onClick={closeCancelDialog}
                    >
                      No
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-red-600 text-white hover:bg-red-700"
                      disabled={
                        reservationNeedsLateCancelAck(cancelTarget) &&
                        !acknowledgeLateCancellation
                      }
                      onClick={() => {
                        setCancelStep("reason");
                        setCancelError(null);
                      }}
                    >
                      Sí
                    </Button>
                  </div>
                </div>
              )}

              {cancelStep === "reason" && (
                <div className="space-y-4">
                  <Alert
                    variant="default"
                    className="border-[#C3CEAB] bg-[#E4E9D8] text-left text-[#2B3418]"
                  >
                    <AlertDescription>
                      Indique el <strong>motivo de la cancelación</strong>. Es
                      obligatorio para continuar.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label
                      htmlFor="cancel-reason"
                      className="text-[#4A4A4A] after:ml-0.5 after:text-red-500 after:content-['*']"
                    >
                      Motivo
                    </Label>
                    <textarea
                      id="cancel-reason"
                      className={cn(
                        cancelTextareaClass,
                        cancelError && "border-destructive",
                      )}
                      placeholder="Ej.: cambio de planes del cliente, clima, cupo insuficiente…"
                      value={cancelReason}
                      onChange={(e) => {
                        setCancelReason(e.target.value);
                        if (cancelError) setCancelError(null);
                      }}
                      disabled={cancelSubmitting}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      El motivo es obligatorio para confirmar la cancelación.
                    </p>
                  </div>
                  {cancelError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription>{cancelError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-2 border-[#313833] bg-transparent text-[#313833] hover:bg-transparent hover:opacity-80"
                      disabled={cancelSubmitting}
                      onClick={() => {
                        setCancelStep("confirm");
                        setCancelError(null);
                      }}
                    >
                      Atrás
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-red-600 text-white hover:bg-red-700"
                      disabled={cancelSubmitting || !cancelReason.trim()}
                      onClick={() => void onConfirmCancel()}
                    >
                      {cancelSubmitting ? "Cancelando…" : "Confirmar cancelación"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
        Lista de reservas
      </h1>

      <div className="mb-4">
        <Input
          id="reservations-search"
          type="search"
          placeholder="Búsqueda por número de reserva, número de reserva de hotel o tour"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            htmlFor="filter-state"
            className="mb-2 block text-sm font-medium text-[#4A4A4A]"
          >
            Estado
          </label>
          <select
            id="filter-state"
            title="Filtrar por estado"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className={`flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!stateFilter ? "text-muted-foreground" : ""}`}
          >
            <option value="">Estado</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En curso</option>
            <option value="cancelled">Cancelada</option>
            <option value="completed">Completada</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="filter-transfer"
            className="mb-2 block text-sm font-medium text-[#4A4A4A]"
          >
            Transfer
          </label>
          <select
            id="filter-transfer"
            title="Filtrar por transfer"
            value={transferFilter}
            onChange={(e) => setTransferFilter(e.target.value)}
            className={`flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!transferFilter ? "text-muted-foreground" : ""}`}
          >
            <option value="">Transfer</option>
            <option value="__none__">Sin transfer</option>
            {transfers.map((t) => (
              <option key={t.license_plate} value={String(t.license_plate)}>
                {t.license_plate} — {t.make} {t.model}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="date-from"
            className="mb-2 block text-sm font-medium text-[#4A4A4A]"
          >
            Desde
          </label>
          <Input
            id="date-from"
            type="date"
            className="bg-white"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="date-to"
            className="mb-2 block text-sm font-medium text-[#4A4A4A]"
          >
            Hasta
          </label>
          <Input
            id="date-to"
            type="date"
            className="bg-white"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Cargando reservas…</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "No se encontraron reservas con los criterios de búsqueda"
              : "No hay reservas"}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center font-semibold text-foreground">
                    N° reserva
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    N° hotel
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Tour
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Fecha
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Hora
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Transfer
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Estado
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Total
                  </TableHead>
                  <TableHead className="w-[50px] text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={String(r.reservation_id)}>
                    <TableCell className="text-center text-sm font-mono">
                      {formatReservationId(r.reservation_id)}
                    </TableCell>
                    <TableCell className="text-center">{r.hotel_reservation}</TableCell>
                    <TableCell
                      className="text-center max-w-[200px] truncate"
                      title={r.tour?.name}
                    >
                      {r.tour?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.date ? new Date(r.date).toLocaleDateString("es-CR") : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.time ? String(r.time) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.transfer
                        ? `${r.transfer.license_plate} · ${r.transfer.make} ${r.transfer.model}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${stateRowBadgeClass(
                          r.state,
                        )}`}
                      >
                        {stateLabels[r.state] ?? r.state}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {formatUsdAmount(r.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                            aria-label="Más opciones"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onSelect={() => {
                              router.push(`/reservas/${r.reservation_id}`);
                            }}
                          >
                            Ver reserva
                          </DropdownMenuItem>
                          {!authLoading &&
                            canUserCancelReservation(user, r) &&
                            r.state !== "cancelled" &&
                            r.state !== "completed" && (
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => {
                                  setCancelTarget(r);
                                  setCancelStep("confirm");
                                  setCancelReason("");
                                  setCancelError(null);
                                  setAcknowledgeLateCancellation(false);
                                }}
                              >
                                Cancelar
                              </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            page={currentPage}
            limit={limit}
            total={pagination?.total ?? reservations.length}
            onPageChange={setCurrentPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        </>
      )}
    </div>
  );
};
