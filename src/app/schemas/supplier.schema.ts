import z from "zod";

// Esquema para consultar suppliers
export const SupplierQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      const num = val ? parseInt(val) : 1;
      // Limitar a máximo 1000 páginas
      return Math.max(1, Math.min(num, 1000));
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const num = val ? parseInt(val) : 10;
      //Limitar a máximo 100 registros por página
      return Math.max(1, Math.min(num, 100));
    }),
  company: z.string().optional(),
  service: z.string().optional(),
});

// Tipos TypeScript
export type SupplierQueryInput = z.infer<typeof SupplierQuerySchema>;

