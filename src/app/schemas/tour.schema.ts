import z from "zod";

// Esquema para crear un schedule de tour
export const CreateTourScheduleSchema = z.object({
  weekday: z.string().min(1, "El día de la semana es requerido"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "El formato de hora debe ser HH:MM"),
});

// Esquema para crear un tour
export const CreateTourSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede tener más de 200 caracteres"),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres"),
  type: z.string().min(1, "El tipo es requerido"),
  availability: z.string().min(1, "La disponibilidad es requerida"),
  base_price: z
    .number()
    .positive("El precio base debe ser un número positivo"),
  spots: z.number().int().positive("Los lugares deben ser un número positivo"),
  requirements: z.string().min(1, "Los requisitos son requeridos"),
  duration: z.string().min(1, "La duración es requerida"),
  difficulty: z.string().min(1, "La dificultad es requerida"),
  /** Si se omite, en API se asume proveedor de operación interna. */
  supplier_corporate: z.number().int().positive().optional(),
});

// Esquema para actualizar un schedule de tour
export const UpdateTourScheduleSchema = z.object({
  weekday: z.string().min(1, "El día de la semana es requerido").optional(),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "El formato de hora debe ser HH:MM")
    .optional(),
});

// Esquema para actualizar un tour
export const UpdateTourSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede tener más de 200 caracteres")
    .optional(),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .optional(),
  type: z.string().min(1, "El tipo es requerido").optional(),
  availability: z.string().min(1, "La disponibilidad es requerida").optional(),
  base_price: z
    .number()
    .positive("El precio base debe ser un número positivo")
    .optional(),
  spots: z
    .number()
    .int()
    .positive("Los lugares deben ser un número positivo")
    .optional(),
  requirements: z.string().min(1, "Los requisitos son requeridos").optional(),
  duration: z.string().min(1, "La duración es requerida").optional(),
  difficulty: z.string().min(1, "La dificultad es requerida").optional(),
  supplier_corporate: z
    .number()
    .int()
    .positive("El proveedor es requerido")
    .optional(),
});

// Esquema para consultar tours
export const TourQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
  type: z.string().optional(),
  name: z.string().optional(),
  availability: z.string().optional(),
  difficulty: z.string().optional(),
});

// Tipos TypeScript
export type CreateTourInput = z.infer<typeof CreateTourSchema>;
export type UpdateTourInput = z.infer<typeof UpdateTourSchema>;
export type TourQueryInput = z.infer<typeof TourQuerySchema>;
export type CreateTourScheduleInput = z.infer<typeof CreateTourScheduleSchema>;
export type UpdateTourScheduleInput = z.infer<typeof UpdateTourScheduleSchema>;
