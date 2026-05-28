import { normalizeAppPath } from "@/lib/route-access";

/** Mensaje por defecto del FAB según la ruta del cliente (sin query) */
export function getClientWhatsAppMessage(pathname: string): string {
  const path = normalizeAppPath(pathname);

  const tourDetail = path.match(/^\/catalogo\/tour\/(\d+)$/);
  if (tourDetail) {
    return `¡Hola! Tengo una consulta sobre el tour (referencia #${tourDetail[1]}).`;
  }

  const tourReserve = path.match(/^\/catalogo\/tour\/(\d+)\/reservar$/);
  if (tourReserve) {
    return `¡Hola! Tengo una consulta sobre la reserva del tour (referencia #${tourReserve[1]}).`;
  }

  if (path === "/catalogo" || path.startsWith("/catalogo/")) {
    return "¡Hola! Tengo una consulta sobre los tours disponibles.";
  }

  return "¡Hola! Tengo una consulta.";
}
