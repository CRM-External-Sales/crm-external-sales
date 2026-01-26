import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para serializar BigInt a Number y Date con formato personalizado
export function serializeForJSON(obj: any): any {
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
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeForJSON(value);
    }
    return serialized;
  }
  
  return obj;
}

// Función para serializar tours con formato especial para time y base_price
export function serializeTourForJSON(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return Number(obj);
  }

  // Evitar dependencia directa de Prisma Decimal en cliente
  if (obj && typeof obj === "object" && typeof (obj as any).toNumber === "function") {
    try {
      return (obj as any).toNumber();
    } catch {
      // continuar si falla
    }
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
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Si es un schedule individual, asegurarse de que start_time se formatee correctamente
      if (key === "tour_schedule" && Array.isArray(value)) {
        serialized[key] = value.map((schedule: any) => ({
          id: typeof schedule.id === "bigint" ? Number(schedule.id) : schedule.id,
          weekday: schedule.weekday,
          start_time:
            schedule.start_time instanceof Date
              ? `${String(schedule.start_time.getUTCHours()).padStart(2, "0")}:${String(schedule.start_time.getUTCMinutes()).padStart(2, "0")}`
              : schedule.start_time,
        }));
      } else {
        serialized[key] = serializeTourForJSON(value);
      }
    }
    return serialized;
  }

  return obj;
}

// Función para registrar acceso a suppliers
// Log asíncrono simple: no bloquea la respuesta
export function logSuppliersAccess(
  user: { id: string; username: string; role: string },
  filters: { company?: string; service?: string }
): void {
  //Ejecutar en el siguiente ciclo del event loop (no bloquea)
  setTimeout(() => {
    const logData = {
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      action: "GET_SUPPLIERS",
      filters: {
        // No exponer datos sensibles, solo indicar qué filtros se usaron
        hasCompanyFilter: !!filters.company,
        hasServiceFilter: !!filters.service,
      },
    };

    // Log en consola (puede extenderse para guardar en BD)
    console.log("📋 Suppliers Access Log:", JSON.stringify(logData, null, 2));
  }, 0);
}