"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, Check, X } from "lucide-react";

const ResetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número")
      .regex(/[@$!%*?&]/, "Debe contener al menos un carácter especial (@$!%*?&)"),
    confirmPassword: z.string().min(1, "Debes confirmar la contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof ResetPasswordFormSchema>;

export const ResetPasswordView = () => {
  const router = useRouter();
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password") || "";
  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", valid: passwordValue.length >= 8 },
    { label: "Al menos una mayúscula", valid: /[A-Z]/.test(passwordValue) },
    { label: "Al menos una minúscula", valid: /[a-z]/.test(passwordValue) },
    { label: "Al menos un número", valid: /[0-9]/.test(passwordValue) },
    { label: "Al menos un símbolo (@$!%*?&)", valid: /[@$!%*?&]/.test(passwordValue) },
  ];

  useEffect(() => {
    let mounted = true;
    const prepareRecoverySession = async () => {
      try {
        setTokenError(null);
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
        } else {
          const hash = window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash;
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw new Error(error.message);
          } else {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              throw new Error("El enlace de recuperación es inválido o expiró.");
            }
          }
        }

        window.history.replaceState({}, "", "/auth/reset-password");
        if (mounted) setTokenReady(true);
      } catch (err) {
        if (!mounted) return;
        setTokenError(err instanceof Error ? err.message : "No se pudo validar el enlace.");
      }
    };

    prepareRecoverySession();
    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setTokenError(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setTokenError(error.message || "No se pudo restablecer la contraseña.");
      return;
    }

    setSuccessMessage("Contraseña actualizada correctamente. Serás redirigido al login.");
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  };

  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center blur-sm transform-gpu scale-105"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
        aria-hidden="true"
      />
      <div className="fixed inset-0 -z-10 bg-[#313833]/55" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center p-4">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full space-y-5 rounded-2xl border border-white/30 bg-neutral-100/95 p-6 shadow-xl backdrop-blur-sm"
          noValidate
        >
          <div className="flex items-center justify-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#647a3a]/15 text-[#647a3a]">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold text-[#1A1F1B]">Crear nueva contraseña</h1>
            <p className="text-sm text-neutral-600">
              Ingresa y confirma tu nueva contraseña para terminar el proceso de recuperación.
            </p>
          </div>

          {tokenError ? (
            <Alert variant="destructive">
              <AlertDescription>{tokenError}</AlertDescription>
            </Alert>
          ) : null}
          {successMessage ? (
            <Alert variant="success">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-[#313833]">
              Nueva contraseña
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="bg-white pl-9 pr-10"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-xs text-neutral-500">
              {passwordRequirements.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1">
                  {item.valid ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-neutral-400" />
                  )}
                  <span className={item.valid ? "text-emerald-700" : "text-neutral-500"}>
                    {item.label}
                  </span>
                </span>
              ))}
            </div>
            {errors.password ? (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#313833]">
              Confirmar contraseña
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className="bg-white pl-9 pr-10"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
                aria-label={
                  showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"
                }
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={!tokenReady || isSubmitting}
            className="w-full bg-[#647a3a] text-white hover:bg-[#4f622d]"
          >
            {isSubmitting ? "Actualizando..." : "Restablecer contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
};

