"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supplierService, type ApiResponse, type Supplier } from "@/lib/api";
import { CreateSupplierSchema } from "@/app/schemas/supplier.schema";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const createSupplierFormSchema = CreateSupplierSchema.extend({
  corporate: z.coerce.number().int().positive("El campo corporate debe ser un número positivo"),
  service: z
    .union([z.literal(""), z.literal("Tour"), z.literal("Transfer")])
    .refine((value) => value !== "", {
      message: "Seleccionar tipo de servicio",
    }),
});

type SupplierFormValues = z.infer<typeof createSupplierFormSchema>;

export const CreateSupplierView = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createSupplierFormSchema),
    defaultValues: {
      corporate: "" as unknown as number,
      company: "",
      phone: "",
      email: "",
      service: "",
    },
  });

  const handleReset = () => {
    reset({
      corporate: "" as unknown as number,
      company: "",
      phone: "",
      email: "",
      service: "",
    });
    setError(null);
    setSuccess(null);
  };

  const onSubmit = async (data: SupplierFormValues) => {
    setError(null);
    setSuccess(null);

    if (data.service !== "Tour" && data.service !== "Transfer") {
      setError("Seleccionar tipo de servicio");
      return;
    }

    try {
      const response = await supplierService.createSupplier({
        corporate: data.corporate,
        company: data.company.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        service: data.service,
      });

      if (response.success && response.data) {
        const created: Supplier = response.data;
        const message = `Proveedor ${created.company} creado correctamente.`;
        setSuccess(message);
        toast.success(message);
        setError(null);
        reset({
          corporate: data.corporate,
          company: "",
          phone: "",
          email: "",
          service: "" as "" | "Tour" | "Transfer",
        });
      } else {
        setError(response.error || "No se pudo crear el proveedor.");
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as ApiResponse;
        setError(
          data.error ||
            data.message ||
            "Ocurrió un error al crear el proveedor. Intenta nuevamente.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al crear el proveedor. Intenta nuevamente.",
        );
      }
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-4xl rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
            Crear Proveedor
          </h1>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Identificación */}
            <div className="space-y-2">
              <Label htmlFor="corporate" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                Identificación
              </Label>
              <Input
                id="corporate"
                type="number"
                min={1}
                step={1}
                placeholder="Ingrese la identificación del proveedor"
                {...register("corporate")}
                className="bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
              />
              {errors.corporate && (
                <p className="text-red-500 text-xs font-medium">{errors.corporate.message}</p>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                Nombre
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="Ingrese el nombre del proveedor"
                {...register("company")}
              />
              {errors.company && (
                <p className="text-red-500 text-xs font-medium">{errors.company.message}</p>
              )}
            </div>

            {/* Correo */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                Correo
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Ingrese el correo electrónico"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ingrese el número de teléfono"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs font-medium">{errors.phone.message}</p>
              )}
            </div>

            {/* Servicio */}
            <div className="space-y-2">
              <Label htmlFor="service" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                Servicio
              </Label>
              <select
                id="service"
                {...register("service")}
                className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  !watch("service") ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                <option value="">Seleccionar tipo de servicio</option>
                <option value="Tour">Tour</option>
                <option value="Transfer">Transfer</option>
              </select>
              {errors.service && (
                <p className="text-red-500 text-xs font-medium">{errors.service.message}</p>
              )}
            </div>

            {/* Acciones */}
            <div className="mt-6 flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="bg-transparent border-2 border-[#313833] text-[#313833] hover:bg-transparent hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                className="bg-[#647a3a] text-white hover:bg-[#4f622d] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#647a3a]"
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
