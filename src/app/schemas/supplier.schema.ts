import z from "zod";

// Esquema para crear un supplier
export const CreateSupplierSchema = z.object({
  corporate: z
    .number()
    .int()
    .positive("El campo corporate debe ser un número positivo"),
  company: z
    .string()
    .min(2, "El nombre de la compañía debe tener al menos 2 caracteres")
    .max(200, "El nombre de la compañía no puede exceder 200 caracteres"),
  phone: z
    .string()
    .min(7, "El teléfono debe tener al menos 7 caracteres")
    .max(30, "El teléfono no puede exceder 30 caracteres"),
  email: z.string().email("Debes proporcionar un email válido"),
  service: z
    .string()
    .min(2, "El servicio debe tener al menos 2 caracteres")
    .max(100, "El servicio no puede exceder 100 caracteres"),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

// Esquema para actualizar un supplier
export const UpdateSupplierSchema = z.object({
  company: z
    .string()
    .min(2, "El nombre de la compañía debe tener al menos 2 caracteres")
    .max(200, "El nombre de la compañía no puede exceder 200 caracteres")
    .optional(),
  phone: z
    .string()
    .min(7, "El teléfono debe tener al menos 7 caracteres")
    .max(30, "El teléfono no puede exceder 30 caracteres")
    .optional(),
  email: z.string().email("Debes proporcionar un email válido").optional(),
  service: z
    .string()
    .min(2, "El servicio debe tener al menos 2 caracteres")
    .max(100, "El servicio no puede exceder 100 caracteres")
    .optional(),
});

export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
