/** Rutas que un usuario con rol `customer` puede ver (además de login / recuperación fuera del CRM). */
export function isCustomerAllowedPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  if (path === "/home" || path === "/catalogo") return true;
  if (path.startsWith("/catalogo/tour/")) return true;
  return false;
}
