import z from "zod";

// Esquema para crear una imagen de tour
export const CreateTourImageSchema = z.object({
  path: z
    .string()
    .min(1, "La ruta de la imagen es requerida")
    .url("La ruta debe ser una URL válida"),
  alt: z.string().min(1, "El texto alternativo es requerido").optional(),
  is_cover: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

// Esquema para actualizar una imagen de tour
export const UpdateTourImageSchema = z.object({
  path: z
    .string()
    .min(1, "La ruta de la imagen es requerida")
    .url("La ruta debe ser una URL válida")
    .optional(),
  alt: z.string().min(1, "El texto alternativo es requerido").optional(),
  is_cover: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

// Esquema para el ordenamiento de imágenes
export const ReorderTourImagesSchema = z.object({
  image_ids: z
    .array(z.number().int().positive())
    .min(1, "Debe proporcionar al menos una imagen"),
});

// Tipos TypeScript
export type CreateTourImageInput = z.infer<typeof CreateTourImageSchema>;
export type UpdateTourImageInput = z.infer<typeof UpdateTourImageSchema>;
export type ReorderTourImagesInput = z.infer<typeof ReorderTourImagesSchema>;

