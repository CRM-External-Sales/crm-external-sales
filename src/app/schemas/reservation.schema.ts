import z from "zod";

export const CreateReservationSchema = z.object({
  tour_id: z.number().int().positive("El ID del tour es requerido"),
  transfer_id: z.number().int().positive().optional(),
  hotel_reservation: z.number().int().positive("El número de habitación/reserva es requerido"),
  date: z.string().datetime("La fecha debe ser válida (ISO 8601)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "El formato de hora debe ser HH:MM"),
  people: z.number().int().positive("La cantidad de personas debe ser mayor a 0"),
  note: z.string().optional().default(""),
  /** Tasa de IVA (0–1), p. ej. 0.13 = 13% */
  iva_rate: z.number().min(0).max(1).default(0.13),
  /** Monto fijo a descontar (misma moneda que precios) */
  discount: z.number().min(0).default(0),
  /**
   * Monto de transfer en la reserva: por defecto el precio de venta del vehículo;
   * el agente puede ajustar el monto acordado con el cliente.
   */
  transfer_amount: z.number().min(0).optional(),
});

/**
 * Formulario de creación. Fecha (calendario) y hora (combo) acotados por `tour_schedule` del tour.
 * `needs_transfer` controla validación de transfer.
 */
export const CreateReservationFormBaseSchema = z
  .object({
    tour_id: z
      .string()
      .min(1, "Seleccione un tour")
      .refine(
        (s) => !Number.isNaN(Number(s)) && Number(s) > 0,
        "Seleccione un tour",
      ),
    hotel_reservation: z.coerce
      .number()
      .int()
      .positive("Ingrese un número de reserva de hotel válido"),
    /** `yyyy-MM-dd` — días visibles en calendario según `tour_schedule.weekday` */
    reservation_date: z
      .string()
      .min(1, "Seleccione la fecha de la reserva")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
    /** `HH:MM` — opciones acotadas al horario del tour para el día elegido */
    reservation_time: z
      .string()
      .min(1, "Seleccione la hora de la reserva")
      .regex(/^\d{2}:\d{2}$/, "Hora en formato HH:MM"),
    people: z.coerce
      .number()
      .int()
      .positive("La cantidad de personas debe ser mayor a 0"),
    note: z.string().optional().default(""),
    needs_transfer: z.enum(["yes", "no"]),
    transfer_id: z.preprocess((v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = typeof v === "string" ? Number(v) : Number(v);
      return Number.isNaN(n) ? undefined : n;
    }, z.number().int().positive().optional()),
    iva_rate: z.coerce.number().min(0, "Mínimo 0").max(1, "Máximo 1"),
    discount: z.coerce.number().min(0, "El descuento no puede ser negativo"),
    transfer_amount: z.preprocess(
      (v) => {
        if (v === "" || v == null) return 0;
        if (typeof v === "number" && Number.isNaN(v)) return 0;
        return v;
      },
      z.coerce
        .number()
        .min(0, "El monto del transfer no puede ser negativo")
        .default(0),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.needs_transfer === "yes" && !data.transfer_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seleccione un transfer",
        path: ["transfer_id"],
      });
    }
  });

export type CreateReservationFormInput = z.input<
  typeof CreateReservationFormBaseSchema
>;
export type CreateReservationFormOutput = z.infer<
  typeof CreateReservationFormBaseSchema
>;

export function createReservationFormDefaultValues(): CreateReservationFormInput {
  return {
    tour_id: "",
    hotel_reservation: "" as unknown as number,
    reservation_date: "",
    reservation_time: "",
    people: 1,
    note: "",
    needs_transfer: "no",
    transfer_id: undefined,
    transfer_amount: 0,
    iva_rate: 0.13,
    discount: 0,
  };
}

const trimOrNull = (v: unknown) => {
  if (v == null) return v;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length === 0 ? null : t;
  }
  return v;
};

export const UpdateReservationSchema = z.object({
  tour_id: z.number().int().positive().optional(),
  transfer_id: z.number().int().positive().optional().nullable(), // Allow null to remove transfer
  hotel_reservation: z.number().int().positive().optional(),
  date: z.string().datetime().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  people: z.number().int().positive().optional(),
  /** Única transición de estado en escritura: cancelar. El resto se calcula con fecha, hora y duración del tour. */
  state: z.literal("cancelled").optional(),
  cancellation_reason: z.preprocess(
    trimOrNull,
    z.string().min(1).optional().nullable(),
  ),
  /**
   * Obligatorio (true) al cancelar **fuera del plazo mínimo**; confirma que el agente vio el aviso de penalidad.
   * No se persiste en base de datos.
   */
  acknowledge_late_cancellation: z.boolean().optional(),
  note: z.string().optional(),
}).refine(
  (data) => {
    if (data.state === "cancelled") {
      return typeof data.cancellation_reason === "string" && data.cancellation_reason.length > 0;
    }
    return true;
  },
  {
    message: "Debe indicar un motivo de cancelación (no solo espacios en blanco)",
    path: ["cancellation_reason"],
  },
);

/** Formulario de nota en detalle; la cancelación se hace con un flujo aparte. */
export const ReservationNoteFormSchema = z.object({
  note: z.string(),
});

export type ReservationNoteFormValues = z.infer<typeof ReservationNoteFormSchema>;

export function reservationNoteFormDefaultValues(
  r?: { note: string } | null,
): ReservationNoteFormValues {
  return { note: r?.note ?? "" };
}

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;

/** Query params for GET /api/reservations (list) */
export const ReservationListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(5),
    /** Un solo día (YYYY-MM-DD); si hay `dateFrom`/`dateTo`, el rango tiene prioridad */
    date: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    state: z.string().optional(),
    /** Matrícula (license_plate). Vacío = sin filtrar. Valor `__none__` = solo reservas sin transfer */
    transfer_id: z.string().optional(),
    q: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      const a = new Date(data.dateFrom).getTime();
      const b = new Date(data.dateTo).getTime();
      return !Number.isNaN(a) && !Number.isNaN(b) && a <= b;
    },
    { message: "Rango de fechas inválido", path: ["dateTo"] },
  );

export type ReservationListQuery = z.infer<typeof ReservationListQuerySchema>;
