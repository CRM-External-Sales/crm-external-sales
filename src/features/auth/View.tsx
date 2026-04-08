"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useAuthForm } from "@/hooks/useAuth";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";
import { useEffect } from "react";

export const View = () => {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const { formData, formErrors, updateField, validateForm } = useAuthForm();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      // Si el evento es recuperación de contraseña, lo detectamos acá y lo redirigimos a donde corresponde
      if (event === "PASSWORD_RECOVERY") {
        router.push("/update-password");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm("login")) return;
    setSubmitting(true);
    const result = await login(formData.email, formData.password);
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1 block">
                Correo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={`bg-background ${
                  formErrors.email
                    ? "border-red-500 focus-visible:ring-red-400"
                    : ""
                }`}
                placeholder="correo@rioperdido.com"
                aria-invalid={!!formErrors.email}
                required
              />
              {formErrors.email ? (
                <p className="mt-1 text-xs text-red-600">
                  {formData.email ? formErrors.email : "Campo requerido"}
                </p>
              ) : null}
              {!formData.email ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  * Campo requerido
                </p>
              ) : null}
            </div>

            <div>
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
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className={`pr-10 ${
                    formErrors.password
                      ? "border-red-500 focus-visible:ring-red-400"
                      : ""
                  }`}
                  placeholder="Ingresa tu contraseña"
                  aria-invalid={!!formErrors.password}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {formErrors.password ? (
                <p className="mt-1 text-xs text-red-600">
                  {formData.password ? formErrors.password : "Campo requerido"}
                </p>
              ) : null}
              {!formData.password ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  * Campo requerido
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


