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
  /** Si se omite, en API se asume proveedor de operación interna. */
  supplier_corporate: z.number().int().positive().optional(),
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
  type: z.string().optional(),
});

/** Enteros positivos desde inputs HTML (texto/número como string) */
const zPositiveIntString = (requiredMsg: string, invalidMsg: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMsg)
    .refine((s) => /^\d+$/.test(s), { message: invalidMsg })
    .transform((s) => parseInt(s, 10))
    .refine((n) => n > 0, { message: invalidMsg });

/** Precio desde string (acepta decimales) */
const zPositivePriceString = (requiredMsg: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMsg)
    .transform((s) => parseFloat(s))
    .refine((n) => !Number.isNaN(n) && n > 0, {
      message: "Debe ser un número positivo",
    });

/**
 * Misma forma que los inputs del cliente; al validar produce el shape de CreateTransferSchema.
 */
export const CreateTransferFormSchema = z.object({
  license_plate: zPositiveIntString(
    "La placa es requerida",
    "La placa debe ser un número entero positivo",
  ),
  make: z.string().trim().min(1, "La marca es requerida"),
  model: z.string().trim().min(1, "El modelo es requerido"),
  category: z.string().trim().min(1, "La categoría es requerida"),
  capacity: zPositiveIntString(
    "La capacidad es requerida",
    "La capacidad debe ser un número entero positivo",
  ),
  supplier_corporate: z.preprocess(
    (v) => {
      if (v === "" || v == null) return undefined;
      const s = String(v).trim();
      if (s === "") return undefined;
      const n = parseInt(s, 10);
      return Number.isNaN(n) ? undefined : n;
    },
    z.number().int().positive().optional(),
  ),
  availability: z.string().trim().min(1, "La disponibilidad es requerida"),
  type: z.string().trim().min(1, "El tipo es requerido"),
  base_price: zPositivePriceString("El precio base es requerido"),
  sale_price: zPositivePriceString("El precio de venta es requerido"),
});

export type CreateTransferFormValues = z.input<typeof CreateTransferFormSchema>;
export type CreateTransferFormOutput = z.output<typeof CreateTransferFormSchema>;

export const createTransferFormEmptyValues = (): CreateTransferFormValues => ({
  license_plate: "",
  make: "",
  model: "",
  category: "",
  capacity: "",
  supplier_corporate: "",
  availability: "",
  type: "",
  base_price: "",
  sale_price: "",
});

export const UpdateTransferFormSchema = CreateTransferFormSchema.omit({
  license_plate: true,
});

export type UpdateTransferFormValues = z.input<typeof UpdateTransferFormSchema>;
export type UpdateTransferFormOutput = z.output<typeof UpdateTransferFormSchema>;

const TransferAvailabilityFilterSchema = z.enum([
  "available",
  "maintenance",
  "unavailable",
]);

const TransferTypeFilterSchema = z.enum(["Interno", "Externo"]);

const zSearchTermSchema = z
  .string()
  .trim()
  .max(100, "La búsqueda no puede exceder 100 caracteres")
  .refine((value) => {
    if (!value) return true;
    if (!/^\d+$/.test(value)) return true;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0;
  }, "La placa debe ser un número entero positivo y válido");

export const TransferViewFiltersSchema = z.object({
  searchTerm: zSearchTermSchema,
  makeFilter: z.string().trim().max(100, "La marca no puede exceder 100 caracteres"),
  categoryFilter: z.string().trim().max(100, "La categoría no puede exceder 100 caracteres"),
  availabilityFilter: z.union([z.literal(""), TransferAvailabilityFilterSchema]),
  typeFilter: z.union([z.literal(""), TransferTypeFilterSchema]),
});

export type TransferViewFiltersValues = z.input<typeof TransferViewFiltersSchema>;

export const transferViewFiltersDefaultValues = (): TransferViewFiltersValues => ({
  searchTerm: "",
  makeFilter: "",
  categoryFilter: "",
  availabilityFilter: "",
  typeFilter: "",
});

// Tipos TypeScript
export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;
export type UpdateTransferInput = z.infer<typeof UpdateTransferSchema>;
export type TransferQueryInput = z.infer<typeof TransferQuerySchema>;
