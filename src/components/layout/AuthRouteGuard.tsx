"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import {
  hasPasswordRecoveryIntent,
  isChangePasswordPath,
  resolveRouteAccess,
} from "@/lib/route-access";

import { RouteAccessSpinner } from "./RouteAccessSpinner";

type AuthRouteGuardProps = {
  children: React.ReactNode;
};

/**
 * Protege rutas de autenticación:
 * - Sin sesión: login, forgot y reset (con enlace válido).
 * - Con sesión: redirige al home del rol salvo reset con token de recuperación.
 */
export function AuthRouteGuard({ children }: AuthRouteGuardProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [recoveryActive, setRecoveryActive] = useState(false);

  useEffect(() => {
    setRecoveryActive(hasPasswordRecoveryIntent());
  }, [pathname]);

  const access = useMemo(
    () =>
      resolveRouteAccess(user?.role, pathname, {
        passwordRecoveryActive: recoveryActive,
      }),
    [user?.role, pathname, recoveryActive],
  );

  useEffect(() => {
    if (loading) return;
    if (!access.allowed && "redirectTo" in access) {
      router.replace(access.redirectTo);
    }
  }, [loading, access, router]);

  if (loading) {
    return <RouteAccessSpinner />;
  }

  if (!access.allowed) {
    return <RouteAccessSpinner />;
  }

  if (isChangePasswordPath(pathname) && !user) {
    return <RouteAccessSpinner />;
  }

  return <>{children}</>;
}
