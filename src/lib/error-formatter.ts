import { ZodError } from "zod";

// Función para formatear errores de Zod de manera amigable
export function formatZodError(error: ZodError): string {
  const issues = error.issues;

  // Si solo hay un error, devolver el mensaje directamente
  if (issues.length === 1) {
    return issues[0].message;
  }

  // Si hay múltiples errores, crear un mensaje más amigable
  const fieldErrors = issues.map((issue) => {
    const field = issue.path.join(".");
    return `• ${issue.message}`;
  });

  return `Por favor corrige los siguientes errores:\n${fieldErrors.join("\n")}`;
}

// Función para obtener errores específicos por campo
export function getFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const field = issue.path.join(".");
    fieldErrors[field] = issue.message;
  });

  return fieldErrors;
}

// Función para crear respuesta de error amigable
export function createValidationErrorResponse(error: ZodError) {
  return {
    success: false,
    error: "Datos inválidos",
    message: formatZodError(error),
    fieldErrors: getFieldErrors(error),
  };
}
