"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { ClientI18nProvider } from "@/components/i18n/ClientI18nProvider";
import { ClientLangSwitcher } from "@/components/i18n/ClientLangSwitcher";
import { ClientShellLayout } from "@/components/layout/ClientShellLayout";
import {
  isCustomerAllowedPath,
  needsClientMarketingI18n,
} from "@/components/layout/customer-paths";
import { isPathForbiddenForAgent } from "@/lib/role-permissions";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const SidebarOutsideClickClose = () => {
  const { open, setOpen, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile || !open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-slot="sidebar-container"]')) return;
      if (target.closest('[data-slot="sidebar-trigger"]')) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isMobile, open, setOpen]);

  return null;
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const clientI18n = needsClientMarketingI18n(pathname, user?.role);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "customer" && !isCustomerAllowedPath(pathname)) {
      router.replace("/home");
      return;
    }

    if (user.role === "agent" && isPathForbiddenForAgent(pathname)) {
      router.replace("/reservas");
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D6D4CB]">
        <div
          className="size-10 animate-pulse rounded-full bg-[#4A6741]/25"
          aria-hidden
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D6D4CB]">
        <div
          className="size-10 animate-pulse rounded-full bg-[#4A6741]/25"
          aria-hidden
        />
      </div>
    );
  }

  if (user.role === "customer" && !isCustomerAllowedPath(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D6D4CB]">
        <div
          className="size-10 animate-pulse rounded-full bg-[#4A6741]/25"
          aria-hidden
        />
      </div>
    );
  }

  if (user.role === "agent" && isPathForbiddenForAgent(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D6D4CB]">
        <div
          className="size-10 animate-pulse rounded-full bg-[#4A6741]/25"
          aria-hidden
        />
      </div>
    );
  }

  if (user.role === "customer") {
    const inner = <ClientShellLayout>{children}</ClientShellLayout>;
    return clientI18n ? (
      <ClientI18nProvider>{inner}</ClientI18nProvider>
    ) : (
      inner
    );
  }

  const adminChromeInner = (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-[#313833]">
            CRM VENTA INTERNA Y EXTERNA
          </span>
        </div>
        {clientI18n ? (
          <div className="ml-auto flex shrink-0 items-center">
            <ClientLangSwitcher variant="onLightToolbar" />
          </div>
        ) : null}
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-10">{children}</main>
    </>
  );

  return (
    <SidebarProvider defaultOpen={false}>
      <SidebarOutsideClickClose />
      <AppSidebar />
      <SidebarInset className="bg-[#D6D4CB]">
        {clientI18n ? (
          <ClientI18nProvider>{adminChromeInner}</ClientI18nProvider>
        ) : (
          adminChromeInner
        )}
      </SidebarInset>
    </SidebarProvider>
  );
};
