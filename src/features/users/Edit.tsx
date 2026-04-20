"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { userService, type User, type ApiResponse } from "@/lib/api";
import { CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { UpdateUserSchema, type UpdateUserInput } from "@/app/schemas/user.schema";
import { useAuth } from "@/hooks/useAuth";

interface EditUserProps {
  user: User;
  onCancel: () => void;
  onSuccess: () => void;
  onDeleteRequest?: () => void;
}

export const EditUserView: React.FC<EditUserProps> = ({ 
  user, 
  onCancel, 
  onSuccess,
  onDeleteRequest 
}) => {
  const { user: currentUser } = useAuth();
  const isOwnUser = currentUser?.username === user.username;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput & { newPassword?: string }>({
    resolver: zodResolver(
      UpdateUserSchema.extend({
        newPassword: z.string()
          .min(8, "La contraseña debe tener al menos 8 caracteres")
          .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
          .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
          .regex(/[0-9]/, "Debe contener al menos un número")
          .regex(/[@$!%*?&]/, "Debe contener al menos un carácter especial (@$!%*?&)")
          .optional()
          .or(z.literal('')),
      })
    ),
    defaultValues: {
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      newPassword: "",
    },
  });

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: UpdateUserInput & { newPassword?: string }) => {
    setGlobalError(null);

    try {
      // Nota: El endpoint de update de usuario en el userService actual
      // solo acepta username, email, phone y role. No acepta contraseña.
      // Si la API lo requiere, se debería enviar. Por ahora enviamos lo que soporta el esquema PUT.
      const payload: Partial<UpdateUserInput> = {
        username: data.username?.trim(),
        email: data.email?.trim(),
        role: data.role,
        phone: data.phone?.trim() || undefined,
      };

      // Agregar la contraseña si se está modificando el usuario logueado
      if (isOwnUser && data.newPassword) {
        (payload as any).password = data.newPassword;
      }

      const response = await userService.updateUser(user.username, payload as any);

      if (response.success && response.data) {
        toast.success(`Usuario '${user.username}' actualizado correctamente.`);
        // También si se ingresó un nuevo password y la API de admin lo requiere en otro endpoint
        // habría que llamarlo. Por el alcance del proyecto actual, se actualizan los datos básicos.
        onSuccess();
      } else {
        setGlobalError(response.error || "No se pudo actualizar el usuario.");
      }
    } catch (err: unknown) {
      const e = err as any;
      if (e?.response?.data) {
        const payloadResp = e.response.data as ApiResponse;
        setGlobalError(
          payloadResp.error ||
          payloadResp.message ||
          "Ocurrió un error al actualizar el usuario. Intenta nuevamente."
        );
      } else {
        setGlobalError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al actualizar el usuario. Intenta nuevamente."
        );
      }
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-[600px] rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
            Modificar usuario
          </h1>

          {globalError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            <div className="space-y-4">
              {/* Nombre de usuario */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#4A4A4A] font-semibold">
                  Nombre de usuario
                </Label>
                <Input
                  id="username"
                  placeholder="Ingrese el nombre de usuario"
                  {...register("username")}
                  disabled
                  className="bg-[#EAEAEA] text-gray-900 opacity-100 disabled:opacity-100 cursor-not-allowed"
                />
                {errors.username && (
                  <p className="text-red-500 text-xs font-medium">{errors.username.message}</p>
                )}
              </div>

              {/* Rol */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[#4A4A4A] font-semibold">
                  Rol
                </Label>
                <select
                  id="role"
                  {...register("role")}
                  disabled={isOwnUser}
                  title={isOwnUser ? "No puedes cambiar tu propio rol" : undefined}
                  className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${isOwnUser ? 'bg-[#EAEAEA] text-gray-900 opacity-100 disabled:opacity-100 cursor-not-allowed' : 'bg-white'}`}
                >
                  <option value="admin">Administrador</option>
                  <option value="agent">Agente</option>
                  <option value="customer">Cliente</option>
                </select>
                {errors.role && (
                  <p className="text-red-500 text-xs font-medium">{errors.role.message}</p>
                )}
              </div>

              {/* Correo */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#4A4A4A] font-semibold">
                  Correo
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ingrese el correo electrónico"
                  {...register("email")}
                  className="bg-white"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#4A4A4A] font-semibold">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ingrese el número de teléfono"
                  {...register("phone")}
                  className="bg-white"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs font-medium">{errors.phone.message}</p>
                )}
              </div>

              {/* Contraseña */}
              {isOwnUser && (
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-[#4A4A4A] font-semibold">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="**********"
                      autoComplete="new-password"
                      {...register("newPassword")}
                      className="bg-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Déjalo en blanco si no deseas cambiar la contraseña.
                  </p>
                  {errors.newPassword && (
                    <p className="text-red-500 text-xs font-medium">{errors.newPassword.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="mt-8 flex justify-between gap-3 font-medium">
              <div>
                {onDeleteRequest && (
                  <Button
                    type="button"
                    onClick={onDeleteRequest}
                    className="bg-[#D32F2F] text-white hover:bg-[#b71c1c] px-6 py-2 rounded-lg font-semibold mr-2"
                  >
                    Eliminar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="bg-transparent border border-gray-400 text-[#313833] hover:bg-gray-100 px-6 py-2 rounded-lg"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>

              <Button
                type="submit"
                className="bg-[#647a3a] text-white hover:bg-[#4f622d] px-8 py-2 rounded-lg font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
