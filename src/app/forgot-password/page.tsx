"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const { forgotPassword, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedirecting) return;
    
    setError(null);
    const res = await forgotPassword(email);
    
    if (res.success) {
      setSent(true);
      setEmail("");
      setIsRedirecting(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } else {
      setError(res.error || "No se pudo enviar el correo");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-[450px] rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-semibold text-[#3C4A22]">
          Restablecer contraseña
        </h1>
        <p className="mb-8 text-center text-sm text-[#4A4A4A]">
          Ingresa tu correo y te enviaremos instrucciones.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#4A4A4A] font-semibold">Correo</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="border-[#C5C5C5] focus-visible:ring-[#3C4A22]"
              required
            />
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {sent ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 text-center">
              Si tu cuenta existe, recibirás un correo en breve.
            </div>
          ) : null}

          <Button 
            type="submit" 
            disabled={loading || isRedirecting}
            className="w-full bg-[#3C4A22] text-white hover:bg-[#2A3318] py-2 rounded-lg font-medium"
          >
            {isRedirecting ? "Redirigiendo..." : loading ? "Enviando..." : "Enviar instrucciones"}
          </Button>
        </form>
      </div>
    </div>
  );
}


