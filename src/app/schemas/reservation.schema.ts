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

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
