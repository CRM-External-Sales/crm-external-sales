import { Prisma } from "@/generated/prisma";

/**
 * Convierte respuestas de Prisma (Decimal, BigInt, Date, time) a JSON seguro.
 * `instanceof Decimal` no es fiable (p. ej. varias copias del runtime en el bundle);
 * se usa `Prisma.Decimal.isDecimal` para detectar decimales.
 */
export function serializeReservationForJSON(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return Number(obj);
  }

  if (Prisma.Decimal.isDecimal(obj)) {
    return obj.toNumber();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeReservationForJSON);
  }

  if (typeof obj === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === "time" && value instanceof Date) {
        const hours = String(value.getUTCHours()).padStart(2, "0");
        const minutes = String(value.getUTCMinutes()).padStart(2, "0");
        serialized[key] = `${hours}:${minutes}`;
      } else {
        serialized[key] = serializeReservationForJSON(value);
      }
    }
    return serialized;
  }

  return obj;
}
