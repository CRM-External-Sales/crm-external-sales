"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy, type HomeLocale } from "@/features/client-home/copy";
import { useClientLocale } from "@/features/client-home/useClientLocale";
import { ClientTourDetail, translateWeekday } from "./TourDetailCard";
import { toast } from "sonner";

const CLIENT_SURFACE = "#F2F1ED";
const WEEKDAY_KEYS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
] as const;

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeWeekday(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getWeekdayFromDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return WEEKDAY_KEYS[date.getDay()] ?? null;
}

function buildReservationSchema(tour: ClientTourDetail, locale: HomeLocale) {
  const t = copy[locale];
  return z
    .object({
      fullName: z.string().min(1, t.validationFullNameRequired),
      people: z
        .any()
        .refine(
          (value) => value !== "" && value !== undefined && value !== null,
          t.validationPeopleRequired
        )
        .transform((value) => Number(value))
        .refine((value) => Number.isFinite(value), t.validationPeopleInvalid)
        .refine((value) => value >= 1, t.validationPeopleMin),
      date: z.string().min(1, t.validationDateRequired),
      schedule: z.string().optional().default(""),
      requiresTransfer: z.enum(["yes", "no"]),
    })
    .superRefine((data, ctx) => {
      if (data.people > tour.spots) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["people"],
          message: t.validationPeopleMax.replace("{count}", String(tour.spots)),
        });
      }

      const today = getTodayDateString();
      if (data.date && data.date < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["date"],
          message: t.validationDatePast,
        });
      }

      const selectedWeekday = data.date ? getWeekdayFromDate(data.date) : null;
      const hasSchedulesForDay =
        selectedWeekday !== null &&
        tour.tour_schedule.some(
          (schedule) =>
            schedule.weekday &&
            schedule.start_time &&
            normalizeWeekday(schedule.weekday) === selectedWeekday
        );

      if (hasSchedulesForDay && !data.schedule) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schedule"],
          message: t.validationScheduleRequired,
        });
      }
    });
}

type ReservationFormValues = {
  fullName: string;
  people: number;
  date: string;
  schedule: string;
  requiresTransfer: "yes" | "no";
};

type ReservationFormInput = {
  fullName: string;
  people: unknown;
  date: string;
  schedule?: string;
  requiresTransfer: "yes" | "no";
};

type TourReservationFormProps = {
  tour: ClientTourDetail;
};

export function TourReservationForm({ tour }: TourReservationFormProps) {
  const { locale } = useClientLocale();
  const t = copy[locale];
  const reservationSchema = useMemo(
    () => buildReservationSchema(tour, locale),
    [tour, locale]
  );
  const today = useMemo(() => getTodayDateString(), []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormInput, unknown, ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      people: 1,
      requiresTransfer: "no",
      schedule: "",
    },
  });

  const selectedDate = watch("date");
  const selectedSchedule = watch("schedule");

  const filteredSchedules = useMemo(() => {
    const selectedWeekday = selectedDate ? getWeekdayFromDate(selectedDate) : null;
    if (!selectedWeekday) return [];

    return tour.tour_schedule.filter(
      (schedule) =>
        schedule.weekday &&
        schedule.start_time &&
        normalizeWeekday(schedule.weekday) === selectedWeekday
    );
  }, [tour.tour_schedule, selectedDate]);

  useEffect(() => {
    if (!selectedSchedule) return;

    const stillValid = filteredSchedules.some((schedule) => {
      if (!schedule.weekday || !schedule.start_time) return false;
      return `${schedule.weekday} - ${schedule.start_time}` === selectedSchedule;
    });

    if (!stillValid) {
      setValue("schedule", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [filteredSchedules, selectedSchedule, setValue]);

  const isScheduleDisabled = !selectedDate || filteredSchedules.length === 0;
  const schedulePlaceholder = !selectedDate
    ? t.timeSelectDateFirst
    : filteredSchedules.length === 0
      ? t.timeNoSchedulesForDay
      : t.timePlaceholder;

  const openWhatsApp = (message: string) => {
    if (!window.navigator.onLine) {
      toast.error(
        locale === "es"
          ? "No se pudo enviar la solicitud. Inténtalo nuevamente"
          : "Could not send the request. Please try again"
      );
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const onSubmit = async (data: ReservationFormValues) => {
    const isEs = locale === "es";

    const [year, month, day] = data.date.split("-");
    const formattedDate = `${day}-${month}-${year}`;

    const message = isEs
      ? `¡Hola! Me gustaría solicitar una reserva para el tour:\n\n*Tour:* ${tour.name}\n*Nombre:* ${data.fullName}\n*Personas:* ${data.people}\n*Fecha:* ${formattedDate}\n*Hora:* ${data.schedule}\n*Requiere transfer:* ${data.requiresTransfer === "yes" ? "Sí" : "No"}`
      : `Hello! I would like to request a reservation for the tour:\n\n*Tour:* ${tour.name}\n*Name:* ${data.fullName}\n*People:* ${data.people}\n*Date:* ${formattedDate}\n*Time:* ${data.schedule}\n*Requires transfer:* ${data.requiresTransfer === "yes" ? "Yes" : "No"}`;

    openWhatsApp(message);
  };

  return (
    <>
      <div
        className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-2xl p-8 shadow-sm md:p-12"
        style={{ backgroundColor: CLIENT_SURFACE }}
      >
        <div className="mb-8 text-center">
          <h2 className="mb-1 text-sm font-semibold text-neutral-500">
            {t.tourToBook}
          </h2>
          <h1 className="text-3xl font-bold text-neutral-600 sm:text-4xl">
            {tour.name}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-semibold text-neutral-500">
              {t.fullName}
            </Label>
            <Input
              id="fullName"
              placeholder={t.fullNamePlaceholder}
              className="h-10 rounded-md border-neutral-200 px-3 text-sm placeholder:text-neutral-400"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm font-medium text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="people" className="text-sm font-semibold text-neutral-500">
              {t.amountOfPeople}
            </Label>
            <Input
              id="people"
              type="number"
              min={1}
              max={tour.spots}
              placeholder={t.amountOfPeoplePlaceholder}
              className="h-10 rounded-md border-neutral-200 px-3 text-sm placeholder:text-neutral-400"
              {...register("people")}
            />
            {errors.people && (
              <p className="text-sm font-medium text-red-500">{errors.people.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold text-neutral-500">
                {t.date}
              </Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  min={today}
                  className="h-10 rounded-md border-neutral-200 pr-10 text-sm text-neutral-600 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                  {...register("date")}
                />
              </div>
              {errors.date && (
                <p className="text-sm font-medium text-red-500">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule" className="text-sm font-semibold text-neutral-500">
                {t.time}
              </Label>
              <select
                id="schedule"
                disabled={isScheduleDisabled}
                {...register("schedule")}
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-sm text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#607536] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F2F1ED] disabled:cursor-not-allowed disabled:bg-[#D6D4CB] disabled:text-neutral-400"
              >
                <option value="" disabled>
                  {schedulePlaceholder}
                </option>
                {filteredSchedules.map((schedule, index) => {
                  if (!schedule.weekday || !schedule.start_time) return null;
                  const value = `${schedule.weekday} - ${schedule.start_time}`;
                  const displayText = `${translateWeekday(schedule.weekday, locale)} - ${schedule.start_time}`;
                  return (
                    <option key={`${value}-${index}`} value={value} className="capitalize">
                      {displayText}
                    </option>
                  );
                })}
              </select>
              {errors.schedule && (
                <p className="text-sm font-medium text-red-500">{errors.schedule.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center pb-4 pt-4">
            <Label className="mb-3 text-sm font-semibold text-neutral-500">
              {t.requiresTransfer}
            </Label>
            <div className="flex gap-8">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="yes"
                  {...register("requiresTransfer")}
                  className="size-4 accent-[#607536]"
                />
                <span className="text-sm font-medium text-neutral-700">{t.yes}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="no"
                  {...register("requiresTransfer")}
                  className="size-4 accent-[#607536]"
                />
                <span className="text-sm font-medium text-neutral-700">{t.no}</span>
              </label>
            </div>
            {errors.requiresTransfer && (
              <p className="mt-2 text-sm font-medium text-red-500">
                {errors.requiresTransfer.message}
              </p>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[#607536] px-8 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3C4A22]"
            >
              {isSubmitting ? "..." : t.requestReservation}
            </Button>
          </div>
        </form>
      </div>

      <button
        type="button"
        onClick={() => {
          const msg =
            locale === "es"
              ? `¡Hola! Tengo una consulta general sobre el tour "${tour.name}".`
              : `Hello! I have a general question about the tour "${tour.name}".`;
          openWhatsApp(msg);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
        aria-label="Preguntar por WhatsApp"
        title="Preguntar por WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-8">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </button>
    </>
  );
}
