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
import { ClientShellLayout } from "@/components/layout/ClientShellLayout";
import { isCustomerAllowedPath } from "@/components/layout/customer-paths";

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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "customer" && !isCustomerAllowedPath(pathname)) {
      router.replace("/home");
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

  if (user.role === "customer") {
    return <ClientShellLayout>{children}</ClientShellLayout>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <SidebarOutsideClickClose />
      <AppSidebar />
      <SidebarInset className="bg-[#D6D4CB]">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
            />
            <span className="text-sm font-medium text-[#313833]">
              CRM VENTA INTERNA Y EXTERNA
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
};
