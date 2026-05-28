import z from "zod";

// Esquemas para autenticación
// Schema para registro público (DESHABILITADO - solo admin puede crear usuarios)
export const SignUpSchema = z.object({
  username: z
    .string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(20, "El nombre de usuario no puede tener más de 20 caracteres")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "El nombre de usuario solo puede contener letras, números y guiones bajos",
    ),
  email: z.string().email({ message: "Email inválido" }),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(
      /[@$!%*?&]/,
      "Debe contener al menos un carácter especial (@$!%*?&)",
    ),
  phone: z.string().optional(),
  role: z.enum(["admin", "agent", "customer"]).default("customer"),
});

// Schema para creación de usuarios por admin
export const CreateUserSchema = z.object({
  username: z
    .string({ message: "El nombre de usuario es obligatorio" })
    .min(1, "El nombre de usuario es obligatorio")
    .min(3, "Debe tener entre 3 y 20 caracteres")
    .max(20, "Debe tener entre 3 y 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo se permiten letras, números y guion bajo (_) sin espacios"),
  email: z
    .string({ message: "El correo es obligatorio" })
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido"),
  password: z
    .string({ message: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria")
    .min(8, "Debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
    .regex(/[a-z]/, "Debe incluir al menos una minúscula")
    .regex(/[0-9]/, "Debe incluir al menos un número")
    .regex(/[@$!%*?&]/, "Debe incluir al menos un carácter especial"),
  phone: z
    .string({ message: "El teléfono es obligatorio" })
    .min(1, "El teléfono es obligatorio")
    .regex(/^\d{8}$/, "Debe contener exactamente 8 números"),
  role: z.enum(["admin", "agent", "customer"], {
    message: "Debe seleccionar un rol"
  }),
});

export const LoginSchema = z.object({
  email: z
    .string({ message: "El correo es requerido" })
    .trim()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo válido"),
  password: z
    .string({ message: "La contraseña es requerida" })
    .min(1, "La contraseña es requerida"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string({ message: "La contraseña actual es requerida" })
    .min(1, "La contraseña actual es requerida"),
  newPassword: z
    .string({ message: "La nueva contraseña es requerida" })
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(
      /[@$!%*?&]/,
      "Debe contener al menos un carácter especial (@$!%*?&)",
    ),
});

/** Formulario de cambio de contraseña (incluye confirmación en cliente) */
export const ChangePasswordFormSchema = ChangePasswordSchema.extend({
  confirmPassword: z
    .string({ message: "Debes confirmar la contraseña" })
    .min(1, "Debes confirmar la contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string({ message: "El correo es requerido" })
    .trim()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo válido"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "El token es requerido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(
      /[@$!%*?&]/,
      "Debe contener al menos un carácter especial (@$!%*?&)",
    ),
});

// Esquemas para gestión de usuarios
export const UpdateUserSchema = z.object({
  username: z
    .string()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(20, "El nombre de usuario no puede tener más de 20 caracteres")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "El nombre de usuario solo puede contener letras, números y guiones bajos",
    )
    .optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  role: z.enum(["admin", "agent", "customer"]).optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(
      /[@$!%*?&]/,
      "Debe contener al menos un carácter especial (@$!%*?&)",
    )
    .optional(),
});

export const UserQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
  role: z.enum(["admin", "agent", "customer"]).optional(),
  search: z.string().optional(),
});

// Tipos TypeScript
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ChangePasswordFormInput = z.infer<typeof ChangePasswordFormSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;
