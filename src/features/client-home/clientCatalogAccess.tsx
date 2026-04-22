"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/** `customer` debe abrir `/home` en esta pestaña antes de ver rutas bajo `/catalogo`. */
const CLIENT_HOME_GATE_KEY = "rp_client_visited_home";

export function markClientHomeVisited(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CLIENT_HOME_GATE_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasClientHomeVisited(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CLIENT_HOME_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearClientHomeGate(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CLIENT_HOME_GATE_KEY);
  } catch {
    // ignore
  }
}

function GateSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className="size-10 animate-pulse rounded-full bg-[#4A6741]/25"
        aria-hidden
      />
    </div>
  );
}

type ClientCatalogAccessGateProps = {
  children: React.ReactNode;
};

/**
 * Gate único para `/catalogo` y subrutas: rol `customer` sin pasar por `/home`
 * en esta pestaña → redirección a `/home`.
 */
export function ClientCatalogAccessGate({ children }: ClientCatalogAccessGateProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user?.role !== "customer") {
      setAllow(true);
      return;
    }
    if (hasClientHomeVisited()) {
      setAllow(true);
      return;
    }
    router.replace("/home");
  }, [loading, user, router]);

  if (loading) return <GateSpinner />;
  if (user?.role === "customer" && !allow) return <GateSpinner />;
  return <>{children}</>;
}
