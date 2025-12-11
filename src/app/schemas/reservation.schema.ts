import z from "zod";

export const CreateReservationSchema = z.object({
  tour_id: z.number().int().positive("El ID del tour es requerido"),
  transfer_id: z.number().int().positive().optional(),
  hotel_reservation: z.number().int().positive("El número de habitación/reserva es requerido"),
  date: z.string().datetime("La fecha debe ser válida (ISO 8601)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "El formato de hora debe ser HH:MM"),
  people: z.number().int().positive("La cantidad de personas debe ser mayor a 0"),
  note: z.string().optional().default(""),
});

export const UpdateReservationSchema = z.object({
  tour_id: z.number().int().positive().optional(),
  transfer_id: z.number().int().positive().optional().nullable(), // Allow null to remove transfer
  hotel_reservation: z.number().int().positive().optional(),
  date: z.string().datetime().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  people: z.number().int().positive().optional(),
  state: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  cancellation_reason: z.string().optional(),
  note: z.string().optional(),
}).refine((data) => {
  if (data.state === "cancelled" && !data.cancellation_reason) {
    return false;
  }
  return true;
}, {
  message: "La razón de cancelación es requerida cuando el estado es cancelado",
  path: ["cancellation_reason"],
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;
