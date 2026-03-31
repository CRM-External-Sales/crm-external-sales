"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedirecting) return;
    
    setError(null);
    
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    
    setLoading(true);
    
    // Supabase permite actualizar al usuario si ya tiene una sesión iniciada
    // (el enlace de recuperación inicia la sesión automáticamente)
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: password,
    });
    
    setLoading(false);
    
    if (updateError) {
      setError(updateError.message || "No se pudo actualizar la contraseña");
    } else {
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setIsRedirecting(true);
      
      setTimeout(() => {
        router.push("/login"); // Después de actualizar, los enviamos a iniciar sesión normalmente
      }, 2000);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-[450px] rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-semibold text-[#3C4A22]">
          Actualizar contraseña
        </h1>
        <p className="mb-8 text-center text-sm text-[#4A4A4A]">
          Ingresa y confirma tu nueva contraseña para acceder a tu cuenta.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#4A4A4A] font-semibold">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="border-[#C5C5C5] focus-visible:ring-[#3C4A22] pr-10 bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-[#4A4A4A] font-semibold">Confirmar Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                className="border-[#C5C5C5] focus-visible:ring-[#3C4A22] pr-10 bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-600 hover:bg-neutral-100"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 text-center">
              Tu contraseña ha sido actualizada exitosamente.
            </div>
          ) : null}

          <Button 
            type="submit" 
            disabled={loading || isRedirecting}
            className="w-full bg-[#3C4A22] text-white hover:bg-[#2A3318] py-2 rounded-lg font-medium"
          >
            {isRedirecting ? "Redirigiendo a Login..." : loading ? "Guardando..." : "Actualizar Contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
