"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import {
  ChangePasswordFormSchema,
  type ChangePasswordFormInput,
} from "@/app/schemas/user.schema";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const changePasswordDefaults: ChangePasswordFormInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export const ChangePasswordView = () => {
  const { changePassword, loading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(ChangePasswordFormSchema),
    defaultValues: changePasswordDefaults,
  });

  const onSubmit = async (data: ChangePasswordFormInput) => {
    setServerError(null);
    setSuccess(null);

    const result = await changePassword(data.currentPassword, data.newPassword);
    if (result.success) {
      setSuccess("Contraseña actualizada correctamente.");
      reset(changePasswordDefaults);
    } else {
      setServerError(result.error || "No se pudo cambiar la contraseña.");
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full space-y-4"
        noValidate
        autoComplete="off"
      >
        <h1 className="text-xl font-semibold">Cambiar contraseña</h1>
        <p className="text-sm text-neutral-600">
          Escribe tu contraseña actual y define una nueva.
        </p>

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert variant="success">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="currentPassword">Contraseña actual</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              className={cn(
                "pr-10",
                errors.currentPassword &&
                  "border-destructive ring-1 ring-destructive/30",
              )}
              {...register("currentPassword")}
            />
            <button
              type="button"
              aria-label={
                showCurrent ? "Ocultar contraseña actual" : "Mostrar contraseña actual"
              }
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
            >
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.currentPassword ? (
            <p className="text-sm text-destructive">
              {errors.currentPassword.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">Nueva contraseña</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              className={cn(
                "pr-10",
                errors.newPassword && "border-destructive ring-1 ring-destructive/30",
              )}
              {...register("newPassword")}
            />
            <button
              type="button"
              aria-label={
                showNew ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"
              }
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
            >
              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.newPassword ? (
            <p className="text-sm text-destructive">{errors.newPassword.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              className={cn(
                "pr-10",
                errors.confirmPassword &&
                  "border-destructive ring-1 ring-destructive/30",
              )}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              aria-label={
                showConfirm
                  ? "Ocultar confirmación de contraseña"
                  : "Mostrar confirmación de contraseña"
              }
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={loading || isSubmitting}>
          {loading || isSubmitting ? "Guardando..." : "Actualizar contraseña"}
        </Button>
      </form>
    </div>
  );
};
