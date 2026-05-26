import { Prisma } from "@/generated/prisma";

export type PrismaUserFacingError = {
  message: string;
  status: number;
  code?: string;
};

/**
 * Mensajes útiles cuando Prisma rechaza DELETE/UPDATE por integridad referencial,
 * sin exponer dumps de motores ni columnas internas.
 */
export function userMessageFromPrismaKnownError(
  error: unknown,
): PrismaUserFacingError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  const constraintRaw = error.meta?.constraint;
  const constraint =
    constraintRaw !== undefined ? String(constraintRaw).toLowerCase() : "";

  switch (error.code) {
    case "P2003": {
      // FK violation (p. ej. tour con reservas)
      if (
        constraint.includes("reservation") &&
        (constraint.includes("tour") || constraint.includes("tour_id"))
      ) {
        return {
          message:
            "No se puede eliminar el tour mientras existan reservas que lo utilizan. Cancele o reasigne esas reservas primero.",
          status: 409,
          code: "FOREIGN_KEY_RESERVATIONS",
        };
      }
      if (constraint.includes("tour") && constraint.includes("supplier")) {
        return {
          message:
            "No se puede eliminar el tour por restricciones con el proveedor asociado. Contacte con soporte si persiste.",
          status: 409,
          code: "FOREIGN_KEY_SUPPLIER",
        };
      }
      return {
        message:
          "No se puede eliminar el registro porque otros datos del sistema dependen de él (integridad referencial).",
        status: 409,
        code: "FOREIGN_KEY_VIOLATION",
      };
    }
    case "P2014": {
      return {
        message:
          "La operación viola una relación requerida entre tablas. Revise dependencias (reservas, horarios, etc.).",
        status: 409,
        code: "RELATION_VIOLATION",
      };
    }
    default:
      return null;
  }
}
