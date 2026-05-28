import { isCustomerOnlyPath, normalizeAppPath } from "@/lib/route-access";

/** Rutas que un usuario con rol `customer` puede ver en el CRM autenticado. */
export function isCustomerAllowedPath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  if (path === "/home") return true;
  return isCustomerOnlyPath(path);
}
