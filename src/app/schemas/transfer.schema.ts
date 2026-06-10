import z from "zod";
import {
  isValidLicensePlateFormat,
  zLicensePlateApi,
  zLicensePlateForm,
} from "@/lib/license-plate";

/** Operación interna: precio de venta siempre coincide con el precio base. */
export function resolveTransferSalePrice(data: {
  type: string;
  base_price: number;
  sale_price?: number;
}): number {
  if (data.type === "Interno") {
    return data.base_price;
  }
  return data.sale_price ?? data.base_price;
}

const applyTransferSalePriceTransform = <
  T extends { type: string; base_price: number; sale_price?: number },
>(
  data: T,
): T & { sale_price: number } => ({
  ...data,
  sale_price: resolveTransferSalePrice(data),
});

// Esquema para crear un transfer
export const CreateTransferSchema = z.object({
  license_plate: zLicensePlateApi(),
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
    .positive("El precio de venta debe ser un número positivo")
    .optional(),
  /** Si se omite, en API se asume proveedor de operación interna. */
  supplier_corporate: z.number().int().positive().optional(),
})
  .superRefine((data, ctx) => {
    if (data.type === "Externo" && data.sale_price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El precio de venta es requerido",
        path: ["sale_price"],
      });
    }
  })
  .transform(applyTransferSalePriceTransform);

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

const zOptionalPositivePriceString = () =>
  z
    .string()
    .trim()
    .transform((s) => (s === "" ? undefined : parseFloat(s)))
    .refine((n) => n === undefined || (!Number.isNaN(n) && n > 0), {
      message: "Debe ser un número positivo",
    });

const transferSalePriceRefine = (
  data: { type: string; sale_price?: number },
  ctx: z.RefinementCtx,
) => {
  if (data.type === "Externo" && data.sale_price == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El precio de venta es requerido",
      path: ["sale_price"],
    });
  }
};

const transferFormFields = {
  license_plate: zLicensePlateForm(
    "La placa es requerida",
    "La placa solo puede contener letras y números",
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
  sale_price: zOptionalPositivePriceString(),
};

/**
 * Misma forma que los inputs del cliente; al validar produce el shape de CreateTransferSchema.
 */
export const CreateTransferFormSchema = z
  .object(transferFormFields)
  .superRefine(transferSalePriceRefine)
  .transform(applyTransferSalePriceTransform);

export const UpdateTransferFormSchema = z
  .object(transferFormFields)
  .omit({ license_plate: true })
  .superRefine(transferSalePriceRefine)
  .transform(applyTransferSalePriceTransform);

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
    return isValidLicensePlateFormat(value);
  }, "La placa solo puede contener letras y números");

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
