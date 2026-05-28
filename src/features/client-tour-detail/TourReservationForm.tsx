"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientTourDetail } from "./TourDetailCard";
import { openWhatsApp } from "@/lib/whatsapp";
import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKeys } from "@/lib/form-draft-keys";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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

function buildReservationSchema(tour: ClientTourDetail, t: TFunction) {
  return z
    .object({
      fullName: z.string().min(1, t("validation.nameRequired")),
      people: z
        .any()
        .refine(
          (value) => value !== "" && value !== undefined && value !== null,
          t("validation.peopleRequired"),
        )
        .transform((value) => Number(value))
        .refine((value) => Number.isFinite(value), t("validation.peopleInvalid"))
        .refine((value) => value >= 1, t("validation.peopleMin")),
      date: z.string().min(1, t("validation.dateRequired")),
      schedule: z.string().optional().default(""),
      requiresTransfer: z.enum(["yes", "no"]),
    })
    .superRefine((data, ctx) => {
      if (tour.spots > 0 && data.people > tour.spots) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["people"],
          message: t("validation.peopleMax", { max: tour.spots }),
        });
      }

      const today = getTodayDateString();
      if (data.date && data.date < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["date"],
          message: t("validation.datePast"),
        });
      }

      const selectedWeekday = data.date ? getWeekdayFromDate(data.date) : null;
      const hasSchedulesForDay =
        selectedWeekday !== null &&
        tour.tour_schedule.some(
          (schedule) =>
            schedule.weekday &&
            schedule.start_time &&
            normalizeWeekday(schedule.weekday) === selectedWeekday,
        );

      if (hasSchedulesForDay && !data.schedule) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schedule"],
          message: t("validation.scheduleRequired"),
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

const clientReservationDefaults: ReservationFormInput = {
  fullName: "",
  people: 1,
  date: "",
  requiresTransfer: "no",
  schedule: "",
};

export function TourReservationForm({ tour }: TourReservationFormProps) {
  const { t: tr, i18n } = useTranslation("client");


  const resolver = useMemo(
    () => zodResolver(buildReservationSchema(tour, tr)),
    [tour, tr, i18n.language],
  );

  const dateFnsLocale = i18n.language.startsWith("en") ? enUS : es;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormInput, unknown, ReservationFormValues>({
    resolver,
    defaultValues: clientReservationDefaults,
  });

  useFormDraft({
    draftKey: formDraftKeys.clientTour.reservation(tour.id_tour),
    form: { watch, reset, getValues },
    defaultValues: clientReservationDefaults,
  });

  const selectedDate = watch("date");
  const selectedSchedule = watch("schedule");

  const validWeekdays = useMemo(() => {
    const weekdays = new Set<string>();
    tour.tour_schedule.forEach((schedule) => {
      if (schedule.weekday) {
        weekdays.add(normalizeWeekday(schedule.weekday));
      }
    });
    return weekdays;
  }, [tour.tour_schedule]);

  const filteredSchedules = useMemo(() => {
    const selectedWeekday = selectedDate ? getWeekdayFromDate(selectedDate) : null;
    if (!selectedWeekday) return [];

    return tour.tour_schedule.filter(
      (schedule) =>
        schedule.weekday &&
        schedule.start_time &&
        normalizeWeekday(schedule.weekday) === selectedWeekday,
    );
  }, [tour.tour_schedule, selectedDate]);

  useEffect(() => {
    if (!selectedSchedule) return;

    const stillValid = filteredSchedules.some((schedule) => {
      if (!schedule.weekday || !schedule.start_time) return false;
      return schedule.start_time === selectedSchedule;
    });

    if (!stillValid) {
      setValue("schedule", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [filteredSchedules, selectedSchedule, setValue]);

  const isScheduleDisabled = !selectedDate || filteredSchedules.length === 0;

  const schedulePlaceholder = useMemo(() => {
    if (!selectedDate) return tr("reservation.schedulePlaceholderDateFirst");
    if (filteredSchedules.length === 0) {
      return tr("reservation.scheduleNoSlots");
    }
    return tr("reservation.scheduleSelectPlaceholder");
  }, [selectedDate, filteredSchedules.length, tr, i18n.language]);

  const onSubmit = async (data: ReservationFormValues) => {
    const [year, month, day] = data.date.split("-");
    const formattedDate = `${day}-${month}-${year}`;

    const transferLabel =
      data.requiresTransfer === "yes" ? tr("reservation.yes") : tr("reservation.no");

    const message = tr("reservation.waMessageIntro", {
      tour: tour.name,
      name: data.fullName,
      people: String(data.people),
      date: formattedDate,
      schedule: data.schedule || "—",
      transfer: transferLabel,
    }) as string;

    openWhatsApp(message);
  };

  return (
    <div
        className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-2xl p-8 shadow-sm md:p-12"
        style={{ backgroundColor: CLIENT_SURFACE }}
      >
        <div className="mb-8 text-center">
          <h2 className="mb-1 text-sm font-semibold text-neutral-500">
            {tr("reservation.subtitle")}
          </h2>
          <h1 className="text-3xl font-bold text-neutral-600 sm:text-4xl">
            {tour.name}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-semibold text-neutral-500">
              {tr("reservation.fullNameLabel")}
            </Label>
            <Input
              id="fullName"
              placeholder={tr("reservation.fullNamePlaceholder")}
              className="h-10 rounded-md border-neutral-200 px-3 text-sm placeholder:text-neutral-400"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm font-medium text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="people" className="text-sm font-semibold text-neutral-500">
              {tr("reservation.peopleLabel")}
            </Label>
            <Input
              id="people"
              type="number"
              min={1}
              max={tour.spots > 0 ? tour.spots : undefined}
              placeholder={tr("reservation.peoplePlaceholder")}
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
                {tr("reservation.dateLabel")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 border-neutral-200 text-sm text-neutral-600 bg-background hover:bg-background",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(
                        new Date(`${selectedDate}T12:00:00`),
                        "PPP",
                        { locale: dateFnsLocale },
                      )
                    ) : (
                      <span>{tr("reservation.selectDatePlaceholder")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={dateFnsLocale}
                    selected={selectedDate ? new Date(`${selectedDate}T12:00:00`) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("date", format(date, "yyyy-MM-dd"), { shouldValidate: true, shouldDirty: true });
                      } else {
                        setValue("date", "", { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today) return true;
                      const weekday = WEEKDAY_KEYS[date.getDay()];
                      return !validWeekdays.has(weekday);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm font-medium text-red-500">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule" className="text-sm font-semibold text-neutral-500">
                {tr("reservation.scheduleLabel")}
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
                  const value = schedule.start_time;
                  return (
                    <option key={`${schedule.weekday}-${value}-${index}`} value={value} className="capitalize">
                      {value}
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
              {tr("reservation.transferQuestion")}
            </Label>
            <div className="flex gap-8">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="yes"
                  {...register("requiresTransfer")}
                  className="size-4 accent-[#607536]"
                />
                <span className="text-sm font-medium text-neutral-700">
                  {tr("reservation.yes")}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="no"
                  {...register("requiresTransfer")}
                  className="size-4 accent-[#607536]"
                />
                <span className="text-sm font-medium text-neutral-700">
                  {tr("reservation.no")}
                </span>
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
              {isSubmitting
                ? tr("reservation.submitting")
                : tr("reservation.submit")}
            </Button>
          </div>
        </form>
      </div>
  );
}
