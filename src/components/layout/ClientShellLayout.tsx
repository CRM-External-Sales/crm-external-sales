"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Eye, EyeOff, Globe, ChevronDown, CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/api";
import { copy } from "@/features/client-home/copy";
import { useClientLocale } from "@/features/client-home/useClientLocale";

const CLIENT_SURFACE = "#F5F2EC";

type ClientShellLayoutProps = {
  children: React.ReactNode;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function ClientShellLayout({ children }: ClientShellLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useClientLocale();
  const t = copy[locale];
  const isHome = pathname === "/home";
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutEmail, setLogoutEmail] = useState("");
  const [logoutPassword, setLogoutPassword] = useState("");
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [showLogoutPassword, setShowLogoutPassword] = useState(false);

  const openLogoutDialog = () => {
    setLogoutError(null);
    setLogoutPassword("");
    setLogoutEmail(user?.email?.trim() ?? "");
    setLogoutOpen(true);
  };

  const closeLogoutDialog = (open: boolean) => {
    setLogoutOpen(open);
    if (!open) {
      setLogoutPassword("");
      setLogoutError(null);
      setLogoutSubmitting(false);
    }
  };

  const handleConfirmLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogoutError(null);

    if (!user?.email) {
      setLogoutError("No hay sesión activa.");
      return;
    }

    const sessionEmail = normalizeEmail(user.email);
    const typedEmail = normalizeEmail(logoutEmail);

    if (!typedEmail || !logoutPassword) {
      setLogoutError("Completa el correo y la contraseña.");
      return;
    }

    if (typedEmail !== sessionEmail) {
      setLogoutError("El correo no coincide con la cuenta de esta sesión.");
      return;
    }

    setLogoutSubmitting(true);
    try {
      const res = await authService.login({
        email: user.email.trim(),
        password: logoutPassword,
      });

      if (!res.success || !res.data?.user) {
        setLogoutError(res.error || "Contraseña incorrecta.");
        return;
      }

      if (res.data.user.id !== user.id) {
        setLogoutError("Las credenciales no corresponden a esta sesión.");
        return;
      }

      await logout();
      setLogoutOpen(false);
      router.push("/login");
    } catch {
      setLogoutError("No se pudo verificar. Intenta de nuevo.");
    } finally {
      setLogoutSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#D6D4CB]">
      {!isHome && (
        <header className="z-50 flex h-[4.5rem] w-full shrink-0 items-center justify-between bg-[#313833] px-6 text-white shadow-sm">
          <div className="flex items-center">
            <Image
              src="/logo-isotipo.png"
              alt="Río Perdido"
              width={184}
              height={40}
              priority
              className="object-contain"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="flex h-10 items-center gap-2 rounded-xl px-3 text-white transition-colors hover:bg-white/5 hover:text-neutral-200">
              <Globe className="size-[1.4rem]" strokeWidth={1.5} />
              <span className="text-sm font-medium">{t.language}</span>
              <ChevronDown className="size-4 opacity-80" />
            </button>
            <button
              onClick={openLogoutDialog}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/5 hover:text-neutral-200"
              title="Perfil / Cerrar sesión"
            >
              <CircleUserRound className="size-7" strokeWidth={1.5} />
            </button>
          </div>
        </header>
      )}

      <main className="min-h-0 w-full flex-1 overflow-y-auto">{children}</main>

      <Dialog open={logoutOpen} onOpenChange={closeLogoutDialog}>
        <DialogContent
          className="border-neutral-200 sm:max-w-md"
          style={{ backgroundColor: CLIENT_SURFACE }}
        >
          <form onSubmit={handleConfirmLogout}>
            <DialogHeader>
              <DialogTitle>Cerrar sesión</DialogTitle>
              <DialogDescription>
                Para salir, confirma el correo y la contraseña de la cuenta.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="client-logout-email">Correo</Label>
                  <Input
                    id="client-logout-email"
                    type="email"
                    autoComplete="username"
                    value={logoutEmail}
                    onChange={(ev) => setLogoutEmail(ev.target.value)}
                    className="border-neutral-200"
                    style={{ backgroundColor: CLIENT_SURFACE }}
                    disabled={logoutSubmitting}
                  />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-logout-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="client-logout-password"
                    type={showLogoutPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={logoutPassword}
                    onChange={(ev) => setLogoutPassword(ev.target.value)}
                    className="border-neutral-200 pr-10"
                    style={{ backgroundColor: CLIENT_SURFACE }}
                    disabled={logoutSubmitting}
                  />
                  <button
                    type="button"
                    aria-label={
                      showLogoutPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
                    onClick={() => setShowLogoutPassword((v) => !v)}
                  >
                    {showLogoutPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              {logoutError ? (
                <p className="text-sm text-destructive">{logoutError}</p>
              ) : null}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeLogoutDialog(false)}
                disabled={logoutSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#4A6741] hover:bg-[#3d5636]"
                disabled={logoutSubmitting}
              >
                {logoutSubmitting ? "Verificando..." : "Cerrar sesión"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
