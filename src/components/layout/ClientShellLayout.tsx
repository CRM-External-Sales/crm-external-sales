"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogOut } from "lucide-react";
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

type ClientShellLayoutProps = {
  children: React.ReactNode;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function ClientShellLayout({ children }: ClientShellLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
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
    <div className="relative flex min-h-screen flex-col">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={openLogoutDialog}
        className="fixed left-4 top-4 z-[60] gap-1.5 rounded-lg border-0 bg-[#3d4540] text-white shadow-md hover:bg-[#2f3531] hover:text-white"
        aria-label="Cerrar sesión"
      >
        <LogOut className="size-4" aria-hidden />
        <span className="text-sm font-medium">Salir</span>
      </Button>

      <main className="min-h-0 w-full flex-1 overflow-y-auto">{children}</main>

      <Dialog open={logoutOpen} onOpenChange={closeLogoutDialog}>
        <DialogContent className="border-neutral-200 sm:max-w-md">
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
                  className="bg-background"
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
                    className="bg-background pr-10"
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
                {logoutSubmitting ? "Verificando…" : "Cerrar sesión"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
