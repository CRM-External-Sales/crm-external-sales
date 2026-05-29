import z from "zod";

/** Solo letras A–Z y dígitos 0–9 (sin espacios ni guiones). */
export const LICENSE_PLATE_REGEX = /^[A-Za-z0-9]+$/;

export const LICENSE_PLATE_MAX_LENGTH = 32;

export const LICENSE_PLATE_INVALID_MESSAGE =
  "La placa solo puede contener letras y números";

export function normalizeLicensePlate(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidLicensePlateFormat(raw: string): boolean {
  const normalized = normalizeLicensePlate(raw);
  return (
    normalized.length > 0 &&
    normalized.length <= LICENSE_PLATE_MAX_LENGTH &&
    LICENSE_PLATE_REGEX.test(normalized)
  );
}

/** Parámetro de ruta `/api/transfers/:id` — decodifica y valida. */
export function parseLicensePlateParam(param: string): string | null {
  try {
    const decoded = decodeURIComponent(param.trim());
    if (!isValidLicensePlateFormat(decoded)) return null;
    return normalizeLicensePlate(decoded);
  } catch {
    return null;
  }
}

export function looksLikeLicensePlateSearch(term: string): boolean {
  const t = term.trim();
  return t.length > 0 && LICENSE_PLATE_REGEX.test(t);
}

const licensePlateRefine = (s: string) => isValidLicensePlateFormat(s);

/** Placa requerida (API / salida normalizada). */
export const zLicensePlateApi = () =>
  z
    .string()
    .trim()
    .min(1, "La placa es requerida")
    .refine(licensePlateRefine, { message: LICENSE_PLATE_INVALID_MESSAGE })
    .transform(normalizeLicensePlate);

/** Placa requerida desde input de formulario (string). */
export const zLicensePlateForm = (requiredMsg: string, invalidMsg?: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMsg)
    .refine(licensePlateRefine, {
      message: invalidMsg ?? LICENSE_PLATE_INVALID_MESSAGE,
    })
    .transform(normalizeLicensePlate);

/** Placa opcional (reservas). */
export const zLicensePlateOptional = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      return normalizeLicensePlate(s);
    })
    .refine((v) => v === undefined || licensePlateRefine(v), {
      message: LICENSE_PLATE_INVALID_MESSAGE,
    });

/** Placa opcional o null (actualizar reserva). */
export const zLicensePlateOptionalNullable = () =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = String(v).trim();
      if (!s) return null;
      return normalizeLicensePlate(s);
    })
    .refine(
      (v) =>
        v === undefined || v === null || licensePlateRefine(v),
      { message: LICENSE_PLATE_INVALID_MESSAGE },
    );
