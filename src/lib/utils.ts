import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Decimal } from "@prisma/client/runtime/library";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para serializar BigInt a Number y Date con formato personalizado
export function serializeForJSON(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === "bigint") {
    return Number(obj);
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeForJSON);
  }
  
  if (typeof obj === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeForJSON(value);
    }
    return serialized;
  }
  
  return obj;
}

// Función para serializar tours con formato especial para time y base_price
export function serializeTourForJSON(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return Number(obj);
  }

  if (obj instanceof Decimal) {
    return obj.toNumber();
  }

  if (obj instanceof Date) {
    // Para campos de tiempo (time, start_time), usar formato HH:mm
    const hours = String(obj.getUTCHours()).padStart(2, "0");
    const minutes = String(obj.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeTourForJSON);
  }

  if (typeof obj === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Si es un schedule individual, asegurarse de que start_time se formatee correctamente
      if (key === "tour_schedule" && Array.isArray(value)) {
        serialized[key] = value.map((schedule: unknown) => {
          const scheduleObj = schedule as Record<string, unknown>;
          return {
            id: typeof scheduleObj.id === "bigint" ? Number(scheduleObj.id) : scheduleObj.id,
            weekday: scheduleObj.weekday,
            start_time:
              scheduleObj.start_time instanceof Date
                ? `${String(scheduleObj.start_time.getUTCHours()).padStart(2, "0")}:${String(scheduleObj.start_time.getUTCMinutes()).padStart(2, "0")}`
                : scheduleObj.start_time,
          };
        });
      } else {
        serialized[key] = serializeTourForJSON(value);
      }
    }
    return serialized;
  }

  return obj;
}