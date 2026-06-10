"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  ReservationNoteFormSchema,
  reservationNoteFormDefaultValues,
  type ReservationNoteFormValues,
} from "@/app/schemas/reservation.schema";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKeys } from "@/lib/form-draft-keys";
import { loadFormDraft } from "@/lib/form-draft-storage";
import { useReservation } from "@/hooks/useReservation";
import { reservationService, type ApiResponse } from "@/lib/api";
import { formatUsdAmount } from "@/lib/format-currency";
import { isAxiosLikeError } from "@/lib/http-error";
import { isReservationCreatedByCurrentUser } from "@/lib/reservation-owner-match";
import { cn } from "@/lib/utils";

const stateLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  cancelled: "Cancelada",
  completed: "Completada",
};

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

function stateBadgeClass(state: string) {
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

export const ReservationDetailView = () => {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const idParam = params.id;
  const idNum = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
  const { reservation, setReservation, loading, error } = useReservation(
    Number.isFinite(idNum) ? idNum : null,
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<"confirm" | "reason">("confirm");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [acknowledgeLateCancellation, setAcknowledgeLateCancellation] =
    useState(false);

  const form = useForm<ReservationNoteFormValues>({
    resolver: zodResolver(ReservationNoteFormSchema),
    defaultValues: reservationNoteFormDefaultValues(),
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  const noteDraftKey = reservation
    ? formDraftKeys.reservations.note(reservation.reservation_id)
    : "reservations/note:pending";
  const noteBaseline = reservation
    ? reservationNoteFormDefaultValues(reservation)
    : reservationNoteFormDefaultValues();
  const noteSyncedRef = useRef(false);

  const { clearDraft: clearNoteDraft } = useFormDraft({
    draftKey: noteDraftKey,
    form: { watch, reset, getValues },
    defaultValues: noteBaseline,
    enabled: !!reservation,
    isReady: !!reservation,
  });

  const ownsReservation =
    !!user &&
    !!reservation &&
    isReservationCreatedByCurrentUser(reservation.employee_user, user.id);

  /** Solo el administrador o el agente dueño pueden editar la nota y enviar PUT de nota. */
  const canEditNote =
    !!user &&
    !!reservation &&
    (user.role === "admin" ||
      (user.role === "agent" && ownsReservation));

  /** Administrador y cualquier agente pueden anular; la nota solo dueño/admin. */
  const canCancelThis =
    !!user &&
    !!reservation &&
    (user.role === "admin" || user.role === "agent") &&
    reservation.state !== "cancelled" &&
    reservation.state !== "completed";

  useEffect(() => {
    noteSyncedRef.current = false;
  }, [reservation?.reservation_id]);

  useEffect(() => {
    if (!reservation || noteSyncedRef.current) return;
    noteSyncedRef.current = true;
    if (loadFormDraft(noteDraftKey)) return;
    reset(reservationNoteFormDefaultValues(reservation));
  }, [reservation, noteDraftKey, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!reservation || !canEditNote) return;
    setSaveError(null);
    try {
      const res = await reservationService.updateReservation(
        Number(reservation.reservation_id),
        {
          note: data.note?.trim() || undefined,
        },
      );
      if (res.success && res.data) {
        setReservation(res.data);
        clearNoteDraft();
        reset(reservationNoteFormDefaultValues(res.data));
        toast.success("Reserva actualizada");
        router.replace(`/reservas/${res.data.reservation_id}`);
      } else {
        setSaveError(res.error || "No se pudo guardar");
      }
    } catch (err) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const d = err.response.data as ApiResponse;
        setSaveError(d.error || d.message || d.details || "Error al actualizar");
      } else {
        setSaveError(err instanceof Error ? err.message : "Error al actualizar");
      }
    }
  });

  const closeCancel = () => {
    setCancelOpen(false);
    setCancelStep("confirm");
    setCancelReason("");
    setCancelError(null);
    setCancelSubmitting(false);
    setAcknowledgeLateCancellation(false);
  };

  const onConfirmCancel = async () => {
    if (!reservation) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("Debe indicar el motivo de la cancelación.");
      return;
    }
    setCancelSubmitting(true);
    setCancelError(null);
    const needsLateAck = reservationNeedsLateCancelAck({
      is_within_cancellation_lead: reservation.is_within_cancellation_lead,
      late_cancellation_penalty_usd: reservation.late_cancellation_penalty_usd,
    });
    try {
      const res = await reservationService.updateReservation(
        Number(reservation.reservation_id),
        {
          state: "cancelled",
          cancellation_reason: reason,
          ...(needsLateAck
            ? { acknowledge_late_cancellation: true as const }
            : {}),
        },
      );
      if (res.success && res.data) {
        setReservation(res.data);
        reset(reservationNoteFormDefaultValues(res.data));
        toast.success("Reserva cancelada");
        closeCancel();
        router.replace(`/reservas/${res.data.reservation_id}`);
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

  if (authLoading || (loading && !error)) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
        <p className="text-center text-muted-foreground">Cargando reserva…</p>
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="border-[#313833]">
          <Link href="/reservas" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
      <AlertDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!open) closeCancel();
        }}
      >
        <AlertDialogContent className="max-w-md border-[#e5e2dc] bg-[#FFFCF4] sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-[#3C4A22]">
              {cancelStep === "confirm" ? "Cancelar reserva" : "Motivo de cancelación"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          {cancelStep === "confirm" && (
            <div className="space-y-4">
              <Alert variant="warning" className="text-left">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <AlertTitle>¿Seguro que desea cancelar?</AlertTitle>
                    <AlertDescription>
                      Esta acción dejará la reserva en estado{" "}
                      <strong>cancelada</strong>. Puede afectar la disponibilidad del
                      tour para otras reservas. En el siguiente paso deberá indicar el
                      motivo.
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
              {reservation && reservationNeedsLateCancelAck(reservation) && (
                <Alert variant="default" className="border-amber-200 bg-amber-50 text-left">
                  <AlertDescription>
                    {reservation.late_cancellation_notice ??
                      "Anulación fuera del plazo mínimo: aplica penalidad. El cobro con el cliente queda a cargo del agente fuera de esta plataforma."}
                  </AlertDescription>
                </Alert>
              )}
              {reservation && reservationNeedsLateCancelAck(reservation) && (
                <div className="flex items-start gap-2 text-left text-sm text-[#4A4A4A]">
                  <input
                    id="ack-late-dtl"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
                    checked={acknowledgeLateCancellation}
                    onChange={(e) =>
                      setAcknowledgeLateCancellation(e.target.checked)
                    }
                  />
                  <label htmlFor="ack-late-dtl" className="leading-snug">
                    Confirmo que informé al cliente la penalidad y que el cobro se
                    coordina con el cliente por aparte.
                  </label>
                </div>
              )}
              <p className="text-sm text-[#4A4A4A]">
                <span className="font-medium">Tour: </span>
                {reservation?.tour?.name ?? "—"}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#313833] bg-transparent"
                  onClick={closeCancel}
                >
                  No
                </Button>
                <Button
                  type="button"
                  className="bg-[#647a3a] text-white hover:bg-[#4f622d]"
                  disabled={
                    !!reservation &&
                    reservationNeedsLateCancelAck(reservation) &&
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
            <div className="space-y-3">
              {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
              <textarea
                className={cancelTextareaClass}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indique el motivo de la cancelación"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeCancel}>
                  Cerrar
                </Button>
                <Button
                  type="button"
                  className="bg-destructive text-destructive-foreground"
                  disabled={cancelSubmitting}
                  onClick={() => {
                    void onConfirmCancel();
                  }}
                >
                  {cancelSubmitting ? "Procesando…" : "Confirmar cancelación"}
                </Button>
              </div>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="text-[#3C4A22] -ml-2">
          <Link href="/reservas" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <h1 className="mb-2 text-center text-2xl font-semibold text-[#3C4A22]">
        Reserva
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        N.º {String(reservation.reservation_id)} · creada por{" "}
        {reservation.app_user?.username ?? "—"}
      </p>

      <div className="mb-6 space-y-3 rounded-md border border-border/60 bg-white p-4 text-sm">
        <InfoRow label="Tour" value={reservation.tour?.name ?? "—"} />
        <InfoRow
          label="Fecha y hora"
          value={[
            reservation.date
              ? new Date(reservation.date).toLocaleDateString("es-CR")
              : "—",
            reservation.time ? String(reservation.time) : "—",
          ].join(" · ")}
        />
        <InfoRow
          label="N.º reserva de hotel"
          value={String(reservation.hotel_reservation)}
        />
        <InfoRow label="Personas" value={String(reservation.people)} />
        <InfoRow
          label="Transfer"
          value={
            reservation.transfer
              ? `${reservation.transfer.license_plate} · ${reservation.transfer.make} ${reservation.transfer.model}`
              : "—"
          }
        />
        <InfoRow
          label="Monto tour"
          value={formatUsdAmount(reservation.tour_amount)}
        />
        <InfoRow
          label="Monto transfer"
          value={formatUsdAmount(reservation.transfer_amount)}
        />
        <InfoRow
          label="Subtotal / IVA / Descuento"
          value={[
            formatUsdAmount(reservation.subtotal),
            formatUsdAmount(reservation.iva),
            formatUsdAmount(reservation.discount),
          ].join(" · ")}
        />
        <InfoRow
          label="Total"
          value={
            <span className="font-semibold text-[#3C4A22]">
              {formatUsdAmount(reservation.total)}
            </span>
          }
        />
        <InfoRow
          label="Estado"
          value={
            <span
              className={cn(
                "inline-block rounded-full px-3 py-1 text-sm font-medium",
                stateBadgeClass(reservation.state),
              )}
            >
              {stateLabels[reservation.state] ?? reservation.state}
            </span>
          }
        />
        <p className="text-xs text-muted-foreground">
          El estado (pendiente, en curso, completada) se actualiza en función de la
          fecha, hora y duración del tour. Solo la cancelación es manual (con motivo).
          Plazos mínimos de anulación sin penalidad: 48 h (operación externa) o 24 h
          (operación interna) antes del inicio del servicio. Si anula con menos
          margen, aplica el mismo monto informativo de penalidad en ambos casos; el
          cobro con el cliente lo coordina el agente por fuera de la plataforma.
        </p>
        {reservationNeedsLateCancelAck(reservation) && reservation.late_cancellation_notice ? (
          <p className="text-xs text-amber-900">
            {reservation.late_cancellation_notice}
          </p>
        ) : null}
        {reservation.cancellation_reason ? (
          <InfoRow
            label="Motivo de cancelación"
            value={reservation.cancellation_reason}
          />
        ) : null}
        {reservation.note ? <InfoRow label="Nota" value={reservation.note} /> : null}
      </div>

      {canEditNote && (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {saveError && (
            <Alert variant="destructive">
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="reservation-note" className="text-[#4A4A4A]">
              Nota
            </Label>
            <textarea
              id="reservation-note"
              className={cn(
                "mt-2 flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                errors.note && "border-destructive",
              )}
              rows={3}
              {...register("note")}
            />
            {errors.note && (
              <p className="mt-1 text-sm text-destructive">{errors.note.message}</p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              {user?.role === "admin"
                ? "Puede modificar la nota de la reserva."
                : "Puede modificar la nota de sus reservas."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#647a3a] text-white hover:bg-[#4f622d] sm:w-auto"
            >
              {isSubmitting ? "Guardando…" : "Guardar nota"}
            </Button>
            {canCancelThis && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive/10 sm:w-auto"
                onClick={() => {
                  setCancelOpen(true);
                  setCancelStep("confirm");
                  setCancelReason("");
                  setCancelError(null);
                  setAcknowledgeLateCancellation(false);
                }}
              >
                Cancelar reserva
              </Button>
            )}
          </div>
        </form>
      )}

      {!canEditNote && canCancelThis && (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            La nota solo la puede editar el agente que creó la reserva o un
            administrador. Cualquier agente puede anular la reserva (por ejemplo si
            el creador no está disponible), con motivo y respetando el plazo mínimo.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive/10 sm:w-auto"
            onClick={() => {
              setCancelOpen(true);
              setCancelStep("confirm");
              setCancelReason("");
              setCancelError(null);
              setAcknowledgeLateCancellation(false);
            }}
          >
            Cancelar reserva
          </Button>
        </div>
      )}

      {!canEditNote && !canCancelThis && user && reservation && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No tiene permisos para modificar esta reserva, o bien la anulación no
          aplica en el estado actual.
        </p>
      )}
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[140px_1fr] sm:items-start">
      <span className="text-muted-foreground">{label}</span>
      <div>{value}</div>
    </div>
  );
}
