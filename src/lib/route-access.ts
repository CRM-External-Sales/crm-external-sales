import type { AppRole } from "@/lib/role-permissions";

/** Normaliza pathname sin query ni barra final redundante */
export function normalizeAppPath(pathname: string): string {
  const path = (pathname.split("?")[0] ?? "").trim() || "/";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/auth/forgot-password",
  "/forgot-password",
] as const;

const PASSWORD_RECOVERY_PATHS = ["/auth/reset-password"] as const;

const CHANGE_PASSWORD_PATHS = ["/auth/change-password"] as const;

const CUSTOMER_ONLY_PREFIXES = ["/catalogo"] as const;

/** Rutas del CRM interno (admin / agente). `/home` es compartida con otro contenido por rol. */
const STAFF_ROUTE_PREFIXES = [
  "/home",
  "/reservas",
  "/tours",
  "/transfers",
  "/proveedores",
  "/usuarios",
  "/reportes",
] as const;

const AGENT_FORBIDDEN_PREFIXES = [
  "/usuarios",
  "/tours/crear",
  "/transfers/crear",
  "/proveedores/crear",
  "/reportes",
] as const;

export function isPublicAuthPath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  return PUBLIC_AUTH_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isPasswordRecoveryPath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  return PASSWORD_RECOVERY_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isChangePasswordPath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  return CHANGE_PASSWORD_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isCustomerOnlyPath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  return CUSTOMER_ONLY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isStaffRoute(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  return STAFF_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isPathForbiddenForAgent(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  return AGENT_FORBIDDEN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Pantalla principal tras iniciar sesión o al denegar una ruta */
export function getRoleHomePath(role: AppRole): string {
  switch (role) {
    case "customer":
      return "/home";
    case "agent":
      return "/reservas";
    case "admin":
      return "/home";
    default:
      return "/login";
  }
}

export function canRoleAccessPath(
  role: AppRole,
  pathname: string,
): boolean {
  const path = normalizeAppPath(pathname);

  if (isCustomerOnlyPath(path)) {
    return role === "customer";
  }

  if (role === "customer") {
    return path === "/home";
  }

  if (!isStaffRoute(path)) {
    return false;
  }

  if (role === "agent" && isPathForbiddenForAgent(path)) {
    return false;
  }

  return role === "admin" || role === "agent";
}

export type RouteAccessResult =
  | { allowed: true }
  | { allowed: false; redirectTo: string };

/**
 * Decide si la ruta actual está permitida y hacia dónde redirigir si no.
 * @param passwordRecoveryActive true si la URL trae `code` o tokens de recuperación en el hash
 */
export function resolveRouteAccess(
  role: AppRole | null | undefined,
  pathname: string,
  options?: { passwordRecoveryActive?: boolean },
): RouteAccessResult {
  const path = normalizeAppPath(pathname);

  if (isChangePasswordPath(path)) {
    if (!role) {
      return { allowed: false, redirectTo: "/login" };
    }
    return { allowed: true };
  }

  if (!role) {
    if (
      path === "/" ||
      isPublicAuthPath(path) ||
      (isPasswordRecoveryPath(path) && options?.passwordRecoveryActive)
    ) {
      return { allowed: true };
    }
    if (isPasswordRecoveryPath(path)) {
      return { allowed: true };
    }
    return { allowed: false, redirectTo: "/login" };
  }

  if (isPublicAuthPath(path) || path === "/") {
    return { allowed: false, redirectTo: getRoleHomePath(role) };
  }

  if (isPasswordRecoveryPath(path)) {
    if (options?.passwordRecoveryActive) {
      return { allowed: true };
    }
    return { allowed: false, redirectTo: getRoleHomePath(role) };
  }

  if (canRoleAccessPath(role, path)) {
    return { allowed: true };
  }

  return { allowed: false, redirectTo: getRoleHomePath(role) };
}

/** Detecta enlace de recuperación de Supabase (query `code` o tokens en hash) */
export function hasPasswordRecoveryIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("code")) return true;
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    return params.has("access_token") && params.has("refresh_token");
  } catch {
    return false;
  }
}
