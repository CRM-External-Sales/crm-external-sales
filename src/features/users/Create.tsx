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
import { userService, type ApiResponse } from "@/lib/api";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { CreateUserSchema, type CreateUserInput } from "@/app/schemas/user.schema";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKeys, SENSITIVE_DRAFT_FIELDS } from "@/lib/form-draft-keys";

interface CreateUserProps {
  onSuccess?: () => void;
}

const userCreateEmptyValues: CreateUserInput = {
  username: "",
  email: "",
  role: "" as CreateUserInput["role"],
  phone: "",
  password: "",
};

export const CreateUserView: React.FC<CreateUserProps> = ({ onSuccess }) => {

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserSchema),
    mode: "onTouched",
    defaultValues: userCreateEmptyValues,
  });

  const { clearDraft } = useFormDraft({
    draftKey: formDraftKeys.users.create,
    form: { watch, reset, getValues },
    defaultValues: userCreateEmptyValues,
    excludeFields: [...SENSITIVE_DRAFT_FIELDS],
  });

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleReset = () => {
    clearDraft();
    reset(userCreateEmptyValues);
    setGlobalError(null);
  };

  const onSubmit = async (data: CreateUserInput) => {
    setGlobalError(null);

    try {
      const response = await userService.createUser({
        username: data.username.trim(),
        email: data.email.trim(),
        role: data.role,
        phone: data.phone?.trim() || undefined,
        password: data.password, // Se envía la contraseña dada
      });

      if (response.success && response.data) {
        toast.success(`Usuario '${data.username}' creado correctamente.`);
        handleReset();
        if (onSuccess) onSuccess();
      } else {
        setGlobalError(response.error || "No se pudo crear el usuario.");
      }
    } catch (err: unknown) {
      const e = err as any;
      if (e?.response?.data) {
        const payload = e.response.data as ApiResponse;
        setGlobalError(
          payload.error ||
          payload.message ||
          "Ocurrió un error al crear el usuario. Intenta nuevamente."
        );
      } else {
        setGlobalError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al crear el usuario. Intenta nuevamente."
        );
      }
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-[600px] rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
            Crear usuario
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
                  Nombre de usuario <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  autoComplete="off"
                  placeholder="Ingrese el nombre de usuario"
                  {...register("username")}
                  className="bg-white"
                />

                {errors.username && (
                  <p className="text-red-500 text-xs font-medium">{errors.username.message}</p>
                )}
              </div>

              {/* Rol */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[#4A4A4A] font-semibold">
                  Rol <span className="text-red-500">*</span>
                </Label>
                <select
                  id="role"
                  {...register("role")}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                >
                  <option value="">Seleccionar rol</option>
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
                  Correo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
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
                  Teléfono <span className="text-red-500">*</span>
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
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#4A4A4A] font-semibold">
                  Contraseña <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Ingrese una contraseña segura"
                    {...register("password")}
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

                {errors.password && (
                  <div className="text-red-500 text-xs font-medium space-y-1">
                    {(() => {
                      const val = watch("password") || "";
                      if (!val) return <p>La contraseña es obligatoria</p>;
                      
                      const reqs = [];
                      if (val.length < 8) reqs.push("Debe tener al menos 8 caracteres");
                      if (!/[A-Z]/.test(val)) reqs.push("Debe incluir al menos una mayúscula");
                      if (!/[a-z]/.test(val)) reqs.push("Debe incluir al menos una minúscula");
                      if (!/[0-9]/.test(val)) reqs.push("Debe incluir al menos un número");
                      if (!/[@$!%*?&]/.test(val)) reqs.push("Debe incluir al menos un carácter especial");
                      
                      return reqs.map((req, i) => <p key={i}>• {req}</p>);
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex justify-between gap-3 font-medium">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="bg-transparent border border-gray-400 text-[#313833] hover:bg-gray-100 px-6 py-2 rounded-lg"
                disabled={isSubmitting}
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                className="bg-[#647a3a] text-white hover:bg-[#4f622d] px-8 py-2 rounded-lg font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
