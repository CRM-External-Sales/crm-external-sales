"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import {
  CreateReservationFormBaseSchema,
  createReservationFormDefaultValues,
  type CreateReservationFormInput,
  type CreateReservationFormOutput,
} from "@/app/schemas/reservation.schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  reservationService,
  tourService,
  transferService,
  type ApiResponse,
  type Tour,
  type TourSchedule,
  type Transfer,
} from "@/lib/api";
import { formatUsd } from "@/lib/format-currency";
import { isAxiosLikeError } from "@/lib/http-error";
import {
  findScheduleMatchingDateAndTime,
  getTimeOptionsForYmd,
  isDateAllowedBySchedules,
  parseLocalDateFromYMD,
  ymdToReservationDateIso,
} from "@/lib/tour-schedule-picker";
import { cn } from "@/lib/utils";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKeys } from "@/lib/form-draft-keys";

const selectBaseClass =
  "flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const inputNumberClass =
  "bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto";

export const CreateReservationView = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const form = useForm<
    CreateReservationFormInput,
    unknown,
    CreateReservationFormOutput
  >({
    resolver: zodResolver(CreateReservationFormBaseSchema),
    defaultValues: createReservationFormDefaultValues(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const reservationDefaults = createReservationFormDefaultValues();
  const { clearDraft } = useFormDraft({
    draftKey: formDraftKeys.reservations.create,
    form: { watch, reset, getValues },
    defaultValues: reservationDefaults,
  });

  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const needsTransfer = useWatch({ control, name: "needs_transfer" });
  const tourIdStr = useWatch({ control, name: "tour_id" });
  const reservationDateW = useWatch({ control, name: "reservation_date" });
  const reservationTimeW = useWatch({ control, name: "reservation_time" });
  const transferId = useWatch({ control, name: "transfer_id" });
  const peopleW = useWatch({ control, name: "people" });
  const ivaRateW = useWatch({ control, name: "iva_rate" });
  const discountW = useWatch({ control, name: "discount" });
  const transferAmountW = useWatch({ control, name: "transfer_amount" });

  /** Tour completo desde GET /api/tours/:id — precio y cupos alineados con el backend, en tiempo real al elegir tour */
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [loadingActiveTour, setLoadingActiveTour] = useState(false);

  /** Cupo en este turno (misma fecha + hora): no muta el tour, solo reservas activas en el slot. */
  const [slotAvailability, setSlotAvailability] = useState<{
    capacity: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [loadingSlot, setLoadingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [busyTransferPlates, setBusyTransferPlates] = useState<string[]>([]);
  const [loadingTransferSlot, setLoadingTransferSlot] = useState(false);
  const [transferSlotError, setTransferSlotError] = useState<string | null>(null);

  const busyTransferSet = useMemo(
    () => new Set(busyTransferPlates),
    [busyTransferPlates],
  );

  useEffect(() => {
    if (!tourIdStr) {
      setActiveTour(null);
      return;
    }
    let cancelled = false;
    setLoadingActiveTour(true);
    void tourService
      .getTourById(String(tourIdStr))
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setActiveTour(res.data);
        } else {
          setActiveTour(null);
        }
      })
      .catch(() => {
        if (!cancelled) setActiveTour(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingActiveTour(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tourIdStr]);

  useEffect(() => {
    if (!tourIdStr || !reservationDateW || !reservationTimeW) {
      setSlotAvailability(null);
      setSlotError(null);
      return;
    }
    let cancelled = false;
    setLoadingSlot(true);
    setSlotError(null);
    void tourService
      .getSlotAvailability(String(tourIdStr), {
        date: reservationDateW,
        time: reservationTimeW,
      })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setSlotAvailability(res.data);
        } else {
          setSlotAvailability(null);
          setSlotError(res.error ?? "No se pudo comprobar el cupo de este turno");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlotAvailability(null);
          setSlotError("No se pudo comprobar el cupo de este turno");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlot(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tourIdStr, reservationDateW, reservationTimeW]);

  useEffect(() => {
    if (
      needsTransfer !== "yes" ||
      !reservationDateW ||
      !reservationTimeW ||
      !tourIdStr
    ) {
      setBusyTransferPlates([]);
      setTransferSlotError(null);
      return;
    }
    const tourIdNum = Number(tourIdStr);
    if (!Number.isFinite(tourIdNum) || tourIdNum < 1) {
      setBusyTransferPlates([]);
      return;
    }
    let cancelled = false;
    setLoadingTransferSlot(true);
    setTransferSlotError(null);
    void transferService
      .getSlotBusyPlates({
        date: reservationDateW,
        time: reservationTimeW,
        tour_id: tourIdNum,
      })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setBusyTransferPlates(res.data.busy_license_plates);
        } else {
          setBusyTransferPlates([]);
          setTransferSlotError(
            res.error ?? "No se pudo comprobar la disponibilidad de los transfers",
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBusyTransferPlates([]);
          setTransferSlotError(
            "No se pudo comprobar la disponibilidad de los transfers",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTransferSlot(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsTransfer, reservationDateW, reservationTimeW, tourIdStr]);

  const peopleForTransfer = useMemo(
    () => Math.max(1, Number(peopleW) || 1),
    [peopleW],
  );

  /** Libres en este turno y con cupo ≥ personas de la reserva (orden: menor capacidad que alcanza primero). */
  const eligibleTransfers = useMemo(() => {
    return transfers
      .filter(
        (t) =>
          Number(t.capacity) >= peopleForTransfer &&
          !busyTransferSet.has(t.license_plate),
      )
      .sort((a, b) => Number(a.capacity) - Number(b.capacity));
  }, [transfers, peopleForTransfer, busyTransferSet]);

  const transferEligibilityNote = useMemo(() => {
    if (needsTransfer !== "yes") return null;
    if (!reservationDateW || !reservationTimeW || loadingTransferSlot) {
      return null;
    }
    if (transfers.length === 0) return null;
    const p = peopleForTransfer;
    const withCapacity = transfers.filter((t) => Number(t.capacity) >= p);
    if (withCapacity.length === 0) {
      return `Ningún vehículo en catálogo cubre ${p} persona(s). Ajuste la cantidad o consulte con administración un transfer de mayor capacidad.`;
    }
    if (withCapacity.every((t) => busyTransferSet.has(t.license_plate))) {
      return `En este turno, todos los transfers con cupo ≥ ${p} persona(s) están ocupados. Pruebe otra hora o continúe sin transfer.`;
    }
    return null;
  }, [
    needsTransfer,
    reservationDateW,
    reservationTimeW,
    loadingTransferSlot,
    transfers,
    peopleForTransfer,
    busyTransferSet,
  ]);

  useEffect(() => {
    if (needsTransfer !== "yes" || transferId == null || transferId === "") {
      return;
    }
    const plateKey = String(transferId).toUpperCase();
    const t = transfers.find((x) => String(x.license_plate) === String(transferId));
    if (!t) {
      setValue("transfer_id", undefined);
      return;
    }
    if (busyTransferSet.has(plateKey) || Number(t.capacity) < peopleForTransfer) {
      setValue("transfer_id", undefined);
    }
  }, [
    needsTransfer,
    transferId,
    busyTransferSet,
    transfers,
    peopleForTransfer,
    setValue,
  ]);

  const selectedTransfer = useMemo(
    () =>
      transferId != null && transferId !== ""
        ? (transfers.find((t) => String(t.license_plate) === String(transferId)) ??
          null)
        : null,
    [transfers, transferId],
  );

  const lastTransferIdForAmountRef = useRef<string | null>(null);
  useEffect(() => {
    if (needsTransfer !== "yes" || transferId == null || transferId === "") {
      lastTransferIdForAmountRef.current = null;
      return;
    }
    const idStr = String(transferId);
    if (lastTransferIdForAmountRef.current === idStr) return;
    lastTransferIdForAmountRef.current = idStr;
    const t = transfers.find((x) => String(x.license_plate) === idStr);
    if (t) {
      setValue("transfer_amount", Number(t.sale_price), {
        shouldValidate: true,
      });
    }
  }, [transferId, needsTransfer, transfers, setValue]);

  const toursConCupos = useMemo(
    () => tours.filter((t) => Number(t.spots) > 0),
    [tours],
  );

  const sinHorariosParaTour =
    Boolean(tourIdStr) && !loadingSchedules && schedules.length === 0;

  const timeOptions = useMemo(
    () => getTimeOptionsForYmd(reservationDateW ?? "", schedules),
    [reservationDateW, schedules],
  );

  const calendarEndMonth = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d;
  }, []);
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (timeOptions.length === 0) {
      if (reservationTimeW) setValue("reservation_time", "");
      return;
    }
    if (reservationTimeW && !timeOptions.some((o) => o.value === reservationTimeW)) {
      setValue("reservation_time", "");
    }
  }, [reservationDateW, timeOptions, reservationTimeW, setValue]);

  const summary = useMemo(() => {
    const people = Math.max(0, Number(peopleW) || 0);
    const baseUnit = activeTour ? Number(activeTour.base_price) : 0;
    if (!Number.isFinite(baseUnit)) {
      return {
        baseUnit: 0,
        tourAmount: 0,
        people,
        transferAmount: 0,
        subtotal: 0,
        iva: 0,
        total: 0,
      };
    }
    const tourAmount = baseUnit * people;
    const transferAmount =
      needsTransfer === "yes" && selectedTransfer
        ? Math.max(0, Number(transferAmountW) || 0)
        : 0;
    const subtotal = tourAmount + transferAmount;
    const ivaRate = Number(ivaRateW);
    const iva = Number.isFinite(ivaRate) ? subtotal * ivaRate : 0;
    const discount = Number(discountW) || 0;
    const total = subtotal + iva - discount;
    return {
      baseUnit,
      tourAmount,
      people,
      transferAmount,
      subtotal,
      iva,
      total,
    };
  }, [
    peopleW,
    activeTour,
    needsTransfer,
    selectedTransfer,
    transferAmountW,
    ivaRateW,
    discountW,
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTours(true);
        const res = await tourService.getTours({
          page: 1,
          limit: 200,
          availability: "Disponible",
        });
        if (res.success && res.data) {
          setTours(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTours(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTransfers(true);
        const res = await transferService.getTransfers({
          page: 1,
          limit: 200,
          availability: "available",
        });
        if (res.success && res.data) {
          setTransfers(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTransfers(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!tourIdStr) {
      setSchedules([]);
      return;
    }
    const id = tourIdStr;
    let cancelled = false;
    const load = async () => {
      setLoadingSchedules(true);
      try {
        const res = await tourService.getTourSchedules(id);
        if (!cancelled && res.success && res.data) {
          setSchedules(res.data);
        }
      } catch {
        if (!cancelled) setSchedules([]);
      } finally {
        if (!cancelled) setLoadingSchedules(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tourIdStr]);

  const onSubmit = async (data: CreateReservationFormOutput) => {
    setServerError(null);
    setSuccess(null);

    if (slotAvailability) {
      if (slotAvailability.remaining < 1) {
        setError("people", {
          type: "manual",
          message: "No hay cupo disponible en este turno. Elija otra hora o fecha.",
        });
        return;
      }
      if (data.people > slotAvailability.remaining) {
        setError("people", {
          type: "manual",
          message: `Solo quedan ${slotAvailability.remaining} espacio(s) en este turno (fecha y hora).`,
        });
        return;
      }
    }

    if (
      !findScheduleMatchingDateAndTime(
        data.reservation_date,
        data.reservation_time,
        schedules,
      )
    ) {
      setError("reservation_time", {
        type: "manual",
        message:
          "La fecha y hora no coinciden con un horario del tour. Vuelva a elegirlas.",
      });
      return;
    }

    if (data.needs_transfer === "yes" && data.transfer_id != null) {
      const chosen = transfers.find(
        (x) => String(x.license_plate) === String(data.transfer_id),
      );
      if (
        chosen &&
        Number(chosen.capacity) < data.people
      ) {
        setError("transfer_id", {
          type: "manual",
          message:
            "El vehículo elegido no tiene capacidad suficiente para la cantidad de personas.",
        });
        return;
      }
      if (busyTransferPlates.includes(data.transfer_id)) {
        setError("transfer_id", {
          type: "manual",
          message:
            "Ese transfer ya está reservado en este turno. Elija otro u otra hora.",
        });
        return;
      }
    }

    const dateIso = ymdToReservationDateIso(data.reservation_date);
    const timeStr = data.reservation_time;

    try {
      const response = await reservationService.createReservation({
        tour_id: Number(data.tour_id),
        hotel_reservation: data.hotel_reservation,
        date: dateIso,
        time: timeStr,
        people: data.people,
        note: data.note?.trim() ?? "",
        transfer_id: data.needs_transfer === "yes" ? data.transfer_id : undefined,
        transfer_amount:
          data.needs_transfer === "yes" && data.transfer_id
            ? data.transfer_amount
            : undefined,
        iva_rate: data.iva_rate,
        discount: data.discount,
      });

      if (response.success && response.data) {
        const message = "Reserva creada correctamente.";
        setSuccess(message);
        toast.success(message);
        clearDraft();
        reset(createReservationFormDefaultValues());
        void tourService
          .getTours({ page: 1, limit: 200, availability: "Disponible" })
          .then((r) => {
            if (r.success && r.data) setTours(r.data);
          });
        setSchedules([]);
      } else {
        setServerError(response.error || "No se pudo crear la reserva.");
      }
    } catch (err: unknown) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const d = err.response.data as ApiResponse & {
          message?: string;
        };
        setServerError(
          d.error ||
            d.message ||
            "Ocurrió un error al crear la reserva. Intenta nuevamente.",
        );
      } else {
        setServerError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al crear la reserva. Intenta nuevamente.",
        );
      }
    }
  };

  const handleReset = () => {
    clearDraft();
    reset(createReservationFormDefaultValues());
    setServerError(null);
    setSuccess(null);
    setSchedules([]);
  };

  return (
    <div className="flex-1">
      <div className="grid gap-8 lg:grid-cols-[1fr_min(100%,22rem)] lg:items-start">
        <div className="rounded-xl bg-[#F2F1ED] p-6 shadow-lg md:p-8">
          <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
            Crear reserva
          </h1>

          {serverError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label
                htmlFor="tour_id"
                className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
              >
                Tour
              </Label>
              <select
                id="tour_id"
                disabled={loadingTours}
                className={cn(
                  selectBaseClass,
                  !watch("tour_id") ? "text-muted-foreground" : "text-foreground",
                  errors.tour_id && "border-destructive ring-1 ring-destructive/30",
                )}
                {...register("tour_id", {
                  onChange: (e) => {
                    setValue("reservation_date", "");
                    setValue("reservation_time", "");
                    if (e.target.value) {
                      const t = toursConCupos.find(
                        (x) => String(x.id_tour) === String(e.target.value),
                      );
                      if (t && Number(t.spots) < 1) {
                        toast.message("Sin cupos en este tour");
                      }
                    }
                  },
                })}
              >
                <option value="">
                  {loadingTours ? "Cargando tours..." : "Seleccionar tour a reservar"}
                </option>
                {toursConCupos.map((t) => (
                  <option key={t.id_tour} value={t.id_tour}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.tour_id && (
                <p className="text-sm text-destructive">{errors.tour_id.message}</p>
              )}
              {!loadingTours && toursConCupos.length === 0 && (
                <p className="text-sm text-amber-800">
                  No hay tours con cupos disponibles. Ajuste disponibilidad o cupos en
                  el catálogo de tours.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="hotel_reservation"
                className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
              >
                Número de reserva de hotel
              </Label>
              <Input
                id="hotel_reservation"
                type="number"
                min={1}
                step={1}
                placeholder="Ingrese el número de reserva de hotel del cliente"
                className={cn(
                  inputNumberClass,
                  errors.hotel_reservation &&
                    "border-destructive ring-1 ring-destructive/30",
                )}
                {...register("hotel_reservation")}
              />
              {errors.hotel_reservation && (
                <p className="text-sm text-destructive">
                  {errors.hotel_reservation.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <div className="space-y-2">
                <Label className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                  Fecha
                </Label>
                <Controller
                  name="reservation_date"
                  control={control}
                  render={({ field }) => (
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            !tourIdStr || loadingSchedules || sinHorariosParaTour
                          }
                          className={cn(
                            "h-10 w-full justify-between border border-input bg-white px-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                            errors.reservation_date &&
                              "border-destructive ring-1 ring-destructive/30",
                          )}
                        >
                          {field.value
                            ? format(
                                parseLocalDateFromYMD(field.value),
                                "d MMMM yyyy",
                                { locale: es },
                              )
                            : "Selecciona la fecha de la reserva"}
                          <CalendarIcon className="h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? parseLocalDateFromYMD(field.value) : undefined
                          }
                          onSelect={(d) => {
                            field.onChange(
                              d
                                ? `${d.getFullYear()}-${String(
                                    d.getMonth() + 1,
                                  ).padStart(2, "0")}-${String(d.getDate()).padStart(
                                    2,
                                    "0",
                                  )}`
                                : "",
                            );
                            setDatePopoverOpen(false);
                          }}
                          disabled={(date) => {
                            const candidate = new Date(date);
                            candidate.setHours(0, 0, 0, 0);
                            const isPast = candidate.getTime() < todayStart.getTime();
                            return isPast || !isDateAllowedBySchedules(date, schedules);
                          }}
                          defaultMonth={
                            field.value
                              ? parseLocalDateFromYMD(field.value)
                              : new Date()
                          }
                          endMonth={calendarEndMonth}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {sinHorariosParaTour && (
                  <p className="text-sm text-amber-800">
                    Este tour no tiene horarios. Defínalos en la edición del tour.
                  </p>
                )}
                {errors.reservation_date && (
                  <p className="text-sm text-destructive">
                    {errors.reservation_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="reservation_time"
                  className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                >
                  Hora
                </Label>
                <div className="relative">
                  <select
                    id="reservation_time"
                    disabled={
                      !tourIdStr ||
                      loadingSchedules ||
                      !reservationDateW ||
                      timeOptions.length === 0
                    }
                    className={cn(
                      selectBaseClass,
                      "appearance-none pr-9",
                      !watch("reservation_time")
                        ? "text-muted-foreground"
                        : "text-foreground",
                      errors.reservation_time &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("reservation_time")}
                  >
                    <option value="">
                      {loadingSchedules
                        ? "Cargando…"
                        : !reservationDateW
                          ? "Primero elija la fecha"
                          : timeOptions.length === 0
                            ? "No hay horas para ese día"
                            : "Seleccionar la hora de la reserva"}
                    </option>
                    {timeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                </div>
                {errors.reservation_time && (
                  <p className="text-sm text-destructive">
                    {errors.reservation_time.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="people"
                className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
              >
                Personas
              </Label>
              {slotError && <p className="text-sm text-amber-800">{slotError}</p>}
              <Input
                id="people"
                type="number"
                min={1}
                max={
                  slotAvailability != null
                    ? Math.max(1, slotAvailability.remaining)
                    : undefined
                }
                step={1}
                placeholder="Ingrese la cantidad de personas"
                className={cn(
                  inputNumberClass,
                  errors.people && "border-destructive ring-1 ring-destructive/30",
                )}
                {...register("people", { valueAsNumber: true })}
                disabled={Boolean(slotAvailability && slotAvailability.remaining < 1)}
              />
              {tourIdStr &&
                reservationDateW &&
                reservationTimeW &&
                (loadingSlot || slotAvailability) && (
                  <p className="text-xs text-muted-foreground" role="status">
                    {loadingSlot ? (
                      <span>Comprobando cupo para esta fecha y hora…</span>
                    ) : slotAvailability ? (
                      slotAvailability.remaining < 1 ? (
                        <span className="text-amber-800">
                          No quedan espacios en este turno. Elija otra hora o fecha.
                        </span>
                      ) : (
                        <span>
                          Quedan {slotAvailability.remaining} espacio(s) en este turno
                          (de {slotAvailability.capacity} en total,{" "}
                          {slotAvailability.used} reservado(s)).
                        </span>
                      )
                    ) : null}
                  </p>
                )}
              {errors.people && (
                <p className="text-sm text-destructive">{errors.people.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-[#4A4A4A] font-semibold">
                Nota
              </Label>
              <textarea
                id="note"
                rows={3}
                placeholder="Ingresar información necesaria para la ejecución de la reserva..."
                className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                {...register("note")}
              />
            </div>

            <div className="space-y-3">
              <span className="text-sm font-semibold text-[#4A4A4A]">
                ¿Requiere transfer?
              </span>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="h-4 w-4 border-input text-[#647a3a] focus:ring-[#647a3a]"
                    value="no"
                    {...register("needs_transfer", {
                      onChange: () => {
                        setValue("transfer_id", undefined);
                        setValue("transfer_amount", 0);
                      },
                    })}
                  />
                  No
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="h-4 w-4 border-input text-[#647a3a] focus:ring-[#647a3a]"
                    value="yes"
                    {...register("needs_transfer")}
                  />
                  Sí
                </label>
              </div>
            </div>

            {needsTransfer === "yes" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="transfer_id"
                    className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                  >
                    Transfer
                  </Label>
                  <select
                    id="transfer_id"
                    disabled={
                      loadingTransfers ||
                      !reservationDateW ||
                      !reservationTimeW ||
                      loadingTransferSlot
                    }
                    className={cn(
                      selectBaseClass,
                      !watch("transfer_id")
                        ? "text-muted-foreground"
                        : "text-foreground",
                      errors.transfer_id &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("transfer_id")}
                  >
                    <option value="">
                      {loadingTransfers
                        ? "Cargando transfers..."
                        : !reservationDateW || !reservationTimeW
                          ? "Elija primero la fecha y hora del tour"
                          : loadingTransferSlot
                            ? "Comprobando disponibilidad…"
                            : "Seleccionar transfer"}
                    </option>
                    {eligibleTransfers.map((t) => (
                      <option key={t.license_plate} value={t.license_plate}>
                        {t.make} {t.model} — {t.license_plate} · cap. {t.capacity}{" "}
                        pers.
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Se muestran solo vehículos <strong>libres</strong> con capacidad &ge;{" "}
                    {peopleForTransfer} persona
                    {peopleForTransfer === 1 ? "" : "s"}. &quot;Libre&quot; significa sin
                    solapamiento con otra reserva en el tramo de servicio (según el tour) más
                    un margen de retorno (por defecto 2 h).
                  </p>
                  {transferSlotError && (
                    <p className="text-sm text-amber-800">{transferSlotError}</p>
                  )}
                  {needsTransfer === "yes" &&
                    reservationDateW &&
                    reservationTimeW &&
                    !loadingTransferSlot &&
                    !transferSlotError &&
                    transferEligibilityNote && (
                      <p className="text-sm text-amber-800">
                        {transferEligibilityNote}
                      </p>
                    )}
                  {errors.transfer_id && (
                    <p className="text-sm text-destructive">
                      {errors.transfer_id.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="transfer_amount"
                    className="text-[#4A4A4A] font-semibold"
                  >
                    Monto del transfer
                  </Label>
                  <Input
                    id="transfer_amount"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    disabled={
                      !selectedTransfer ||
                      loadingTransfers ||
                      !reservationDateW ||
                      !reservationTimeW ||
                      loadingTransferSlot
                    }
                    className={cn(
                      inputNumberClass,
                      errors.transfer_amount &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("transfer_amount", { valueAsNumber: true })}
                  />
                  {selectedTransfer && (
                    <p className="text-xs text-muted-foreground">
                      Precio base (catálogo):{" "}
                      {formatUsd(Number(selectedTransfer.sale_price))}. Puede ajustar el
                      monto según lo acordado con el cliente.
                    </p>
                  )}
                  {errors.transfer_amount && (
                    <p className="text-sm text-destructive">
                      {errors.transfer_amount.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="border-2 border-[#313833] bg-transparent text-[#313833] hover:bg-transparent hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                className="bg-[#647a3a] text-white hover:bg-[#4f622d] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#647a3a]"
                disabled={
                  isSubmitting ||
                  sinHorariosParaTour ||
                  (Boolean(tourIdStr) && loadingSchedules) ||
                  (!loadingTours && toursConCupos.length === 0) ||
                  (Boolean(tourIdStr) &&
                    Boolean(reservationDateW) &&
                    Boolean(reservationTimeW) &&
                    loadingSlot) ||
                  (slotAvailability != null && slotAvailability.remaining < 1) ||
                  (needsTransfer === "yes" &&
                    Boolean(reservationDateW) &&
                    Boolean(reservationTimeW) &&
                    loadingTransferSlot) ||
                  (needsTransfer === "yes" &&
                    Boolean(reservationDateW) &&
                    Boolean(reservationTimeW) &&
                    eligibleTransfers.length === 0)
                }
              >
                {isSubmitting ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-border/50 bg-white p-6 shadow-md lg:sticky lg:top-6">
          <h2 className="mb-4 text-center text-lg font-semibold text-[#3C4A22]">
            Resumen
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Precio base</dt>
              <dd className="font-medium tabular-nums">
                {tourIdStr && loadingActiveTour
                  ? "…"
                  : activeTour
                    ? formatUsd(summary.baseUnit)
                    : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Cantidad de personas</dt>
              <dd className="font-medium tabular-nums">{summary.people}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-dashed pb-2">
              <dt className="text-muted-foreground">Monto tour</dt>
              <dd className="font-semibold text-[#313833] tabular-nums">
                {tourIdStr && loadingActiveTour ? "…" : formatUsd(summary.tourAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Monto transfer</dt>
              <dd className="font-medium">{formatUsd(summary.transferAmount)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b pb-2">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{formatUsd(summary.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">IVA (tasa)</dt>
              <dd className="w-24">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  className="h-8 text-right"
                  {...register("iva_rate")}
                />
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">IVA (monto)</dt>
              <dd className="font-medium">{formatUsd(summary.iva)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Descuento</dt>
              <dd className="w-32">
                <Input
                  type="number"
                  step="1"
                  min={0}
                  className="h-8 text-right"
                  {...register("discount")}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatUsd(summary.total)}</span>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
