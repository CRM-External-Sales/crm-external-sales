/**
 * Permisos del CRM por rol — único lugar de verdad para reglas repetidas en UI y rutas.
 * Admin: gestión CRUD de catálogo, usuarios y reportes.
 * Agente: consulta de tours / proveedores / transfers y gestión propia de reservas.
 */

export type AppRole = "admin" | "agent" | "customer";

export function isAdminRole(role: AppRole | string | undefined | null): boolean {
  return role === "admin";
}

/** Catálogo: tours, proveedores y transfers — solo administración completa para admin */
export function canManageCatalog(role: AppRole | string | undefined | null): boolean {
  return role === "admin";
}

export function canAccessUsersArea(role: AppRole | string | undefined | null): boolean {
  return role === "admin";
}

export function canAccessReports(role: AppRole | string | undefined | null): boolean {
  return role === "admin";
}

export function canCreateOrListReservations(
  role: AppRole | string | undefined | null,
): boolean {
  return role === "admin" || role === "agent";
}

/** Rutas prohibidas si el usuario es agente (evita navegación directa a pantallas solo admin). */
export function isPathForbiddenForAgent(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").trim() || "/";
  const forbiddenPrefixes = [
    "/usuarios",
    "/tours/crear",
    "/transfers/crear",
    "/proveedores/crear",
    "/reportes",
  ] as const;

  for (const prefix of forbiddenPrefixes) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}
