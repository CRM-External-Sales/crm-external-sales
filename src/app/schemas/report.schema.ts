import z from "zod";

/**
 * Tipos de reporte permitidos
 * Cada tipo define una pregunta de negocio específica
 */
export const TIPOS_REPORTE = [
  "reservas_tiempo",    
  "reservas_estado",    
  "reservas_empleado",  
  "ingresos_tiempo",   
  "ingresos_tour",     
] as const;

/**
 * Granularidades temporales permitidas
 * Solo aplican para reportes de tiempo (reservas_tiempo, ingresos_tiempo)
 */
export const GRANULARIDADES_TEMPORALES = ["semana", "mes", "trimestre", "año"] as const;

// Esquema para validar query params del endpoint de reportes
export const ReportQuerySchema = z.object({
  // Tipo de reporte: define la pregunta de negocio
  tipo_reporte: z.enum(TIPOS_REPORTE, {
    message: "tipo_reporte es requerido y debe ser uno de los tipos válidos",
  }),
  // Granularidad temporal: solo aplica para reportes de tiempo
  // Define cómo agrupar los datos temporales 
  granularidad_temporal: z.enum(GRANULARIDADES_TEMPORALES).optional(),
  // Filtros de fecha 
  fecha_inicio: z
    .string()
    .refine(
      (val) => {
        if (!val) return false;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "fecha_inicio es requerida y debe ser una fecha válida" },
    ),
  fecha_fin: z
    .string()
    .refine(
      (val) => {
        if (!val) return false;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "fecha_fin es requerida y debe ser una fecha válida" },
    ),
  // Filtros opcionales 
  tourId: z
    .string()
    .optional()
    .transform((val) => (val ? BigInt(val) : undefined)),
  usuarioId: z.string().uuid().optional(),
  estado: z.string().optional(), // Estado de la reserva
  tipo_reserva: z.enum(["con_transfer", "sin_transfer"]).optional(),
  // Paginación (query string → número; valores inválidos rechazan la petición)
  page: z
    .string()
    .optional()
    .transform((val) => (val == null || val === "" ? "1" : val))
    .pipe(
      z
        .string()
        .regex(/^\d+$/, { message: "page debe ser un entero positivo" })
        .transform(Number)
        .pipe(z.number().int().min(1, { message: "page debe ser mayor o igual a 1" })),
    ),
  limit: z
    .string()
    .optional()
    .transform((val) => (val == null || val === "" ? "10" : val))
    .pipe(
      z
        .string()
        .regex(/^\d+$/, { message: "limit debe ser un entero positivo" })
        .transform(Number)
        .pipe(
          z
            .number()
            .int()
            .min(1, { message: "limit debe estar entre 1 y 1000" })
            .max(1000, { message: "limit debe estar entre 1 y 1000" }),
        ),
    ),
})
  .refine(
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
  )
  .refine(
    (data) => {
      // Validar que granularidad_temporal sea requerida para reportes de tiempo
      if (data.tipo_reporte === "reservas_tiempo" || data.tipo_reporte === "ingresos_tiempo") {
        return data.granularidad_temporal !== undefined;
      }
      return true;
    },
    {
      message: "granularidad_temporal es requerida para reportes de tiempo",
      path: ["granularidad_temporal"],
    },
  );

// Tipo TypeScript
export type ReportQueryInput = z.infer<typeof ReportQuerySchema>;





