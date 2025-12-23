import z from "zod";

// Esquema para validar query params del endpoint de reportes
export const ReportQuerySchema = z.object({
  // Filtros de fecha
  fecha_inicio: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "fecha_inicio debe ser una fecha válida" },
    ),
  fecha_fin: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "fecha_fin debe ser una fecha válida" },
    ),
  // Tipo de reporte: trimestral, semestral, anual, o personalizado
  tipo_reporte: z
    .enum(["trimestral", "semestral", "anual", "personalizado"])
    .optional()
    .default("personalizado"),
  // Filtros específicos
  tourId: z
    .string()
    .optional()
    .transform((val) => (val ? BigInt(val) : undefined)),
  usuarioId: z.string().uuid().optional(),
  estado: z.string().optional(), // Estado de la reserva (ej: "cancelada", "confirmada")
  // Paginación y límites
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1000))
    .refine((val) => val > 0 && val <= 1000, {
      message: "limit debe estar entre 1 y 1000",
    }),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .refine((val) => val > 0, {
      message: "page debe ser mayor a 0",
    }),
}).refine(
  (data) => {
    // Validar que fecha_inicio <= fecha_fin si ambas están presentes
    if (data.fecha_inicio && data.fecha_fin) {
      const inicio = new Date(data.fecha_inicio);
      const fin = new Date(data.fecha_fin);
      return inicio <= fin;
    }
    return true;
  },
  {
    message: "fecha_inicio debe ser menor o igual a fecha_fin",
    path: ["fecha_inicio"],
  },
);

// Tipo TypeScript
export type ReportQueryInput = z.infer<typeof ReportQuerySchema>;





