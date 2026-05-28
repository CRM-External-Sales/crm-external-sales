"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { LoginSchema, type LoginInput } from "@/app/schemas/user.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const loginDefaultValues: LoginInput = {
  email: "",
  password: "",
};

export const View = () => {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: loginDefaultValues,
    mode: "onSubmit",
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    const result = await login(data.email.trim(), data.password);
    setSubmitting(false);
    if (result.success) {
      router.push("/home");
    }
  };

  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center blur-sm transform-gpu scale-105"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 -z-10 bg-[#313833]/50"
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen w-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-neutral-100/95 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold">Bienvenido</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Inicio de Sesión CRM VENTA INTERNA Y EXTERNA
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
            autoComplete="on"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="mb-1 block">
                Correo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder="correo@rioperdido.com"
                aria-invalid={!!errors.email}
                className={cn(
                  "bg-background",
                  errors.email && "border-destructive ring-1 ring-destructive/30",
                )}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium"
                >
                  Contraseña <span className="text-destructive">*</span>
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  aria-invalid={!!errors.password}
                  className={cn(
                    "pr-10",
                    errors.password && "border-destructive ring-1 ring-destructive/30",
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full bg-[#647a3a] hover:bg-[#4f622d]"
              disabled={loading || submitting}
            >
              {loading || submitting ? "Iniciando..." : "Iniciar sesión"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
