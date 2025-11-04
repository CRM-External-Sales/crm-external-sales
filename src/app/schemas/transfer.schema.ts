import z from "zod";

// Esquema para crear un transfer
export const CreateTransferSchema = z.object({
  license_plate: z
    .number()
    .int()
    .positive("La placa debe ser un número positivo"),
  availability: z.string().min(1, "La disponibilidad es requerida"),
  make: z.string().min(1, "La marca es requerida"),
  model: z.string().min(1, "El modelo es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
  capacity: z.number().int().positive("La capacidad debe ser positiva"),
  type: z.string().min(1, "El tipo es requerido"),
  base_price: z
    .number()
    .positive("El precio base debe ser un número positivo"),
  sale_price: z
    .number()
    .positive("El precio de venta debe ser un número positivo"),
  supplier_corporate: z
    .number()
    .int()
    .positive("El proveedor es requerido"),
});

// Esquema para actualizar un transfer
export const UpdateTransferSchema = z.object({
  availability: z.string().min(1, "La disponibilidad es requerida").optional(),
  make: z.string().min(1, "La marca es requerida").optional(),
  model: z.string().min(1, "El modelo es requerido").optional(),
  category: z.string().min(1, "La categoría es requerida").optional(),
  capacity: z.number().int().positive("La capacidad debe ser positiva").optional(),
  type: z.string().min(1, "El tipo es requerido").optional(),
  base_price: z
    .number()
    .positive("El precio base debe ser un número positivo")
    .optional(),
  sale_price: z
    .number()
    .positive("El precio de venta debe ser un número positivo")
    .optional(),
  supplier_corporate: z
    .number()
    .int()
    .positive("El proveedor es requerido")
    .optional(),
});

// Esquema para consultar transfers
export const TransferQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
  make: z.string().optional(),
  category: z.string().optional(),
  availability: z.string().optional(),
});

// Tipos TypeScript
export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;
export type UpdateTransferInput = z.infer<typeof UpdateTransferSchema>;
export type TransferQueryInput = z.infer<typeof TransferQuerySchema>;
