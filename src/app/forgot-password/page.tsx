"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await forgotPassword(email);
    if (res.success) setSent(true);
    else setError(res.error || "No se pudo enviar el correo");
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center p-4">
      <form onSubmit={onSubmit} className="w-full space-y-4">
        <h1 className="text-xl font-semibold">Restablecer contraseña</h1>
        <p className="text-sm text-neutral-600">
          Ingresa tu correo y te enviaremos instrucciones.
        </p>
        <div>
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
          />
        </div>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {sent ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Correo enviado si la cuenta existe.
          </div>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar"}
        </Button>
      </form>
    </div>
  );
}


