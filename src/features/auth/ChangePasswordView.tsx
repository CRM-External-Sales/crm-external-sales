"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ChangePasswordView = () => {
  const { changePassword, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      setSuccess("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setError(result.error || "No se pudo cambiar la contraseña.");
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center p-4">
      <form onSubmit={onSubmit} className="w-full space-y-4">
        <h1 className="text-xl font-semibold">Cambiar contraseña</h1>
        <p className="text-sm text-neutral-600">
          Escribe tu contraseña actual y define una nueva.
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert variant="success">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <div>
          <Label htmlFor="currentPassword">Contraseña actual</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="newPassword">Nueva contraseña</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Actualizar contraseña"}
        </Button>
      </form>
    </div>
  );
};

