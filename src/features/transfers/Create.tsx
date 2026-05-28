"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreateTransferFormSchema,
  createTransferFormEmptyValues,
  type CreateTransferFormValues,
  type CreateTransferFormOutput,
} from "@/app/schemas/transfer.schema";
import { transferService, supplierService, type ApiResponse, type Transfer, type Supplier } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isAxiosLikeError } from "@/lib/http-error";

import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKeys } from "@/lib/form-draft-keys";

const selectBaseClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const CreateTransferView = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<
    CreateTransferFormValues,
    unknown,
    CreateTransferFormOutput
  >({
    resolver: zodResolver(CreateTransferFormSchema),
    defaultValues: createTransferFormEmptyValues(),
  });

  const emptyValues = createTransferFormEmptyValues();
  const { clearDraft } = useFormDraft({
    draftKey: formDraftKeys.transfers.create,
    form: { watch, reset, getValues },
    defaultValues: emptyValues,
  });

  const supplierCorporate = watch("supplier_corporate");
  const availability = watch("availability");
  const type = watch("type");

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const response = await supplierService.getSuppliers({
          page: 1,
          limit: 100,
          service: "Transfer",
        });
        if (response.success && response.data) {
          setSuppliers(response.data);
        }
      } catch (err) {
        console.error("Error cargando proveedores:", err);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    loadSuppliers();
  }, []);

  const onSubmit = async (data: CreateTransferFormOutput) => {
    setServerError(null);
    setSuccess(null);

    try {
      const response = await transferService.createTransfer({
        license_plate: data.license_plate,
        ...(data.supplier_corporate != null
          ? { supplier_corporate: data.supplier_corporate }
          : {}),
        availability: data.availability,
        make: data.make,
        model: data.model,
        category: data.category,
        capacity: data.capacity,
        type: data.type,
        base_price: data.base_price,
        sale_price: data.sale_price ?? data.base_price,
      });

      if (response.success && response.data) {
        const created: Transfer = response.data;
        const message = `Transfer con placa ${created.license_plate} creado correctamente.`;
        setSuccess(message);
        toast.success(message);
        clearDraft();
        reset({
          ...createTransferFormEmptyValues(),
          license_plate: String(created.license_plate),
        });
      } else {
        setServerError(response.error || "No se pudo crear el transfer.");
      }
    } catch (err: unknown) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const data = err.response.data as ApiResponse & { message?: string; fieldErrors?: Record<string, string> };
        setServerError(
          data.message ||
            data.error ||
            "Ocurrió un error al crear el transfer. Intenta nuevamente.",
        );
      } else {
        setServerError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al crear el transfer. Intenta nuevamente.",
        );
      }
    }
  };

  const handleReset = () => {
    clearDraft();
    reset(createTransferFormEmptyValues());
    setServerError(null);
    setSuccess(null);
  };

  const inputNumberClass =
    "bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100";

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-4xl rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
            Crear transfer
          </h1>

          {serverError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="license_plate" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Placa de transfer
                  </Label>
                  <Input
                    id="license_plate"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Número de placa"
                    className={cn(
                      inputNumberClass,
                      errors.license_plate && "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("license_plate")}
                  />
                  {errors.license_plate && (
                    <p className="text-sm text-destructive">{errors.license_plate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="make" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Marca
                  </Label>
                  <Input
                    id="make"
                    type="text"
                    placeholder="Ingrese la marca del vehículo"
                    className={cn(errors.make && "border-destructive ring-1 ring-destructive/30")}
                    {...register("make")}
                  />
                  {errors.make && (
                    <p className="text-sm text-destructive">{errors.make.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Modelo
                  </Label>
                  <Input
                    id="model"
                    type="text"
                    placeholder="Ingrese el modelo del vehículo"
                    className={cn(errors.model && "border-destructive ring-1 ring-destructive/30")}
                    {...register("model")}
                  />
                  {errors.model && (
                    <p className="text-sm text-destructive">{errors.model.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Categoría
                  </Label>
                  <Input
                    id="category"
                    type="text"
                    placeholder="Ingrese la categoría del transfer"
                    className={cn(errors.category && "border-destructive ring-1 ring-destructive/30")}
                    {...register("category")}
                  />
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Capacidad
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Ingrese la capacidad del vehículo"
                    className={cn(
                      inputNumberClass,
                      errors.capacity && "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("capacity")}
                  />
                  {errors.capacity && (
                    <p className="text-sm text-destructive">{errors.capacity.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="supplier_corporate" className="text-[#4A4A4A] font-semibold">
                    Proveedor
                  </Label>
                  <select
                    id="supplier_corporate"
                    disabled={loadingSuppliers}
                    className={cn(
                      selectBaseClass,
                      supplierCorporate === "" ? "text-muted-foreground" : "text-foreground",
                      errors.supplier_corporate && "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("supplier_corporate")}
                  >
                    <option value="">
                      {loadingSuppliers
                        ? "Cargando proveedores…"
                        : "Operación interna (sin proveedor externo)"}
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.corporate} value={supplier.corporate.toString()}>
                        {supplier.company} ({supplier.corporate})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Si no aplica un proveedor externo, deje el valor por defecto; el transfer
                    queda como operación interna.
                  </p>
                  {errors.supplier_corporate && (
                    <p className="text-sm text-destructive">{errors.supplier_corporate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Disponibilidad
                  </Label>
                  <select
                    id="availability"
                    className={cn(
                      selectBaseClass,
                      availability === "" ? "text-muted-foreground" : "text-foreground",
                      errors.availability && "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("availability")}
                  >
                    <option value="">Seleccionar la disponibilidad del transfer</option>
                    <option value="available">Disponible</option>
                    <option value="maintenance">En mantenimiento</option>
                    <option value="unavailable">No disponible</option>
                  </select>
                  {errors.availability && (
                    <p className="text-sm text-destructive">{errors.availability.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Tipo
                  </Label>
                  <select
                    id="type"
                    className={cn(
                      selectBaseClass,
                      type === "" ? "text-muted-foreground" : "text-foreground",
                      errors.type && "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("type")}
                  >
                    <option value="">Seleccionar el tipo de transfer</option>
                    <option value="Interno">Interno</option>
                    <option value="Externo">Externo</option>
                  </select>
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_price" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">
                    Precio base
                  </Label>
                  <Input
                    id="base_price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Ingrese el precio base del transfer"
                    className={cn(
                      inputNumberClass,
                      errors.base_price && "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("base_price")}
                  />
                  {errors.base_price && (
                    <p className="text-sm text-destructive">{errors.base_price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="sale_price"
                    className={cn(
                      "text-[#4A4A4A] font-semibold",
                      watch("type") === "Externo" &&
                        "after:ml-1 after:text-red-500 after:content-['*']",
                    )}
                  >
                    Precio venta
                  </Label>
                  <Input
                    id="sale_price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Ingrese el precio venta del transfer"
                    disabled={watch("type") === "Interno"}
                    className={cn(
                      inputNumberClass,
                      errors.sale_price && "border-destructive ring-1 ring-destructive/30",
                    )}
                    {...register("sale_price")}
                  />
                  {errors.sale_price && (
                    <p className="text-sm text-destructive">{errors.sale_price.message}</p>
                  )}
                </div>
              </div>
            </div>

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
