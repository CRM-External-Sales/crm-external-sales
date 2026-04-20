"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

const ForgotPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo válido"),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordFormSchema>;

export const ForgotPasswordView = () => {
  const { forgotPassword, loading } = useAuth();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (redirectIntervalRef.current) {
        clearInterval(redirectIntervalRef.current);
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    if (isRedirecting) return;
    setServerError(null);
    setSent(false);
    const res = await forgotPassword(values.email);
    if (res.success) {
      setSent(true);
      setIsRedirecting(true);
      setRedirectCountdown(3);
      redirectIntervalRef.current = setInterval(() => {
        setRedirectCountdown((prev) => (prev > 1 ? prev - 1 : prev));
      }, 1000);
      redirectTimeoutRef.current = setTimeout(() => {
        if (redirectIntervalRef.current) {
          clearInterval(redirectIntervalRef.current);
          redirectIntervalRef.current = null;
        }
        router.push("/login");
      }, 3000);
    }
    else setServerError(res.error || "No se pudo enviar el correo");
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
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold text-[#1A1F1B]">Restablecer contraseña</h1>
            <p className="text-sm text-neutral-600">
              Ingresa tu correo y te enviaremos un enlace seguro para crear una nueva contraseña.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[#313833]">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              className="bg-white"
              {...register("email")}
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          ) : null}
          {sent ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Correo enviado si la cuenta existe. Te redirigimos al login en unos segundos.
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={loading || isRedirecting}
            className="w-full bg-[#647a3a] text-white hover:bg-[#4f622d]"
          >
            {isRedirecting
              ? `Redirigiendo en ${redirectCountdown}s...`
              : loading
                ? "Enviando..."
                : "Enviar enlace de recuperación"}
          </Button>
        </form>
      </div>
    </div>
  );
};

