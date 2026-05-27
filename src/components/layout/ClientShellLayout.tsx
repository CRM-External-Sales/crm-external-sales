"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Eye, EyeOff, CircleUserRound } from "lucide-react";
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
import { ClientLangSwitcher } from "@/components/i18n/ClientLangSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/api";
import { useTranslation } from "react-i18next";

const CLIENT_SURFACE = "#F5F2EC";

type LogoutStep = "confirm" | "credentials";

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
  const { t } = useTranslation("client");
  const isHome = pathname === "/home";
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutStep, setLogoutStep] = useState<LogoutStep>("confirm");
  const [logoutEmail, setLogoutEmail] = useState("");
  const [logoutPassword, setLogoutPassword] = useState("");
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [showLogoutPassword, setShowLogoutPassword] = useState(false);

  const openLogoutDialog = () => {
    setLogoutError(null);
    setLogoutPassword("");
    setLogoutStep("confirm");
    setLogoutOpen(true);
  };

  const goToLogoutCredentials = () => {
    setLogoutError(null);
    setLogoutPassword("");
    setLogoutEmail(user?.email?.trim() ?? "");
    setLogoutStep("credentials");
  };

  const closeLogoutDialog = (open: boolean) => {
    setLogoutOpen(open);
    if (!open) {
      setLogoutStep("confirm");
      setLogoutPassword("");
      setLogoutError(null);
      setLogoutSubmitting(false);
    }
  };

  const handleConfirmLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogoutError(null);

    if (!user?.email) {
      setLogoutError(t("shell.errNoSession"));
      return;
    }

    const sessionEmail = normalizeEmail(user.email);
    const typedEmail = normalizeEmail(logoutEmail);

    if (!typedEmail || !logoutPassword) {
      setLogoutError(t("shell.errIncomplete"));
      return;
    }

    if (typedEmail !== sessionEmail) {
      setLogoutError(t("shell.errEmailMismatch"));
      return;
    }

    setLogoutSubmitting(true);
    try {
      const res = await authService.login({
        email: user.email.trim(),
        password: logoutPassword,
      });

      if (!res.success || !res.data?.user) {
        setLogoutError(res.error || t("shell.errBadPassword"));
        return;
      }

      if (res.data.user.id !== user.id) {
        setLogoutError(t("shell.errWrongUser"));
        return;
      }

      await logout();
      setLogoutOpen(false);
      router.push("/login");
    } catch {
      setLogoutError(t("shell.errVerifyFailed"));
    } finally {
      setLogoutSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#D6D4CB]">
      {!isHome && (
        <header className="z-50 flex h-[4.5rem] w-full shrink-0 items-center justify-between gap-3 bg-[#313833] px-6 text-white shadow-sm">
          <div className="flex min-w-0 shrink items-center">
            <Image
              src="/logo-isotipo.png"
              alt={t("shell.logoAria")}
              width={184}
              height={40}
              priority
              className="object-contain"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ClientLangSwitcher variant="onDarkShell" />
            <button
              type="button"
              onClick={openLogoutDialog}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/5 hover:text-neutral-200"
              title={t("shell.profileTitle")}
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
          {logoutStep === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("shell.logoutAskTitle")}</DialogTitle>
                <DialogDescription>
                  {t("shell.logoutAskDesc")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeLogoutDialog(false)}
                >
                  {t("shell.logoutStay")}
                </Button>
                <Button
                  type="button"
                  className="bg-[#4A6741] hover:bg-[#3d5636]"
                  onClick={goToLogoutCredentials}
                >
                  {t("shell.logoutContinue")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleConfirmLogout}>
              <DialogHeader>
                <DialogTitle>{t("shell.logoutCredTitle")}</DialogTitle>
                <DialogDescription>
                  {t("shell.logoutCredDesc")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="client-logout-email">{t("shell.email")}</Label>
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
                  <Label htmlFor="client-logout-password">
                    {t("shell.password")}
                  </Label>
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
                          ? t("shell.hidePassword")
                          : t("shell.showPassword")
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
                  {t("shell.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4A6741] hover:bg-[#3d5636]"
                  disabled={logoutSubmitting}
                >
                  {logoutSubmitting
                    ? t("shell.logoutVerify")
                    : t("shell.logoutButton")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
