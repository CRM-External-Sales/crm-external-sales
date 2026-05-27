/** Rutas que un usuario con rol `customer` puede ver (además de login / recuperación fuera del CRM). */
export function isCustomerAllowedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  if (path === "/home" || path === "/catalogo") return true;
  if (path.startsWith("/catalogo/tour/")) return true;
  return false;
}

/**
 * i18next solo en vistas «cliente»:
 * `/home` si el usuario es customer; rutas `/catalogo` siempre si visitan ese flujo.
 * El `/home` de admin/agente (CRM splash) sin i18n.
 */
export function needsClientMarketingI18n(
  pathname: string,
  role: string | undefined,
): boolean {
  const path = pathname.split("?")[0] || "/";
  if (path.startsWith("/catalogo")) return true;
  if (path === "/home" && role === "customer") return true;
  return false;
}
