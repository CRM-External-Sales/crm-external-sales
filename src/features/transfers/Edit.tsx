"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UpdateTransferFormSchema,
  type UpdateTransferFormValues,
  type UpdateTransferFormOutput,
} from "@/app/schemas/transfer.schema";
import { transferService, supplierService, type ApiResponse, type Transfer, type Supplier } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AxiosError } from "axios";

import { CheckCircle2 } from "lucide-react";

const selectBaseClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface EditTransferViewProps {
  transfer: Transfer;
  onCancel: () => void;
  onSuccess: () => void;
}

function transferToFormState(transfer: Transfer): UpdateTransferFormValues {
  const corporate =
    transfer.supplier_corporate ?? transfer.supplier?.corporate ?? 0;
  return {
    make: transfer.make ?? "",
    model: transfer.model ?? "",
    category: transfer.category ?? "",
    capacity: transfer.capacity != null ? String(transfer.capacity) : "",
    supplier_corporate: corporate ? String(corporate) : "",
    availability: transfer.availability ?? "",
    type: transfer.type ?? "",
    base_price:
      transfer.base_price != null && !Number.isNaN(Number(transfer.base_price))
        ? String(transfer.base_price)
        : "",
    sale_price:
      transfer.sale_price != null && !Number.isNaN(Number(transfer.sale_price))
        ? String(transfer.sale_price)
        : "",
  };
}

export const EditTransferView = ({ transfer, onCancel, onSuccess }: EditTransferViewProps) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const licensePlate = String(transfer.license_plate ?? "");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTransferFormValues, unknown, UpdateTransferFormOutput>({
    resolver: zodResolver(UpdateTransferFormSchema),
    defaultValues: transferToFormState(transfer),
  });

  const supplierCorporate = watch("supplier_corporate");
  const availability = watch("availability");
  const type = watch("type");

  // Cargar proveedores con servicio "Transfer"
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

  const handleDelete = () => {
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    setDeleteError(null);
    setServerError(null);
    setSuccess(null);
    setDeleting(true);

    try {
      const licensePlateNumber = parseInt(licensePlate, 10);
      const response = await transferService.deleteTransfer(licensePlateNumber);

      if (response.success) {
        setDeleteDialogOpen(false);
        setSuccess("Transfer eliminado correctamente.");
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setDeleteError(response.error || "No se pudo eliminar el transfer.");
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as ApiResponse & { details?: string };
        const status = err.response.status;

        if (status === 409) {
          const errorMessage = data.error || "No se puede eliminar el transfer porque tiene reservas asociadas.";
          const detailsMessage = data.details ? ` ${data.details}` : "";
          setDeleteError(errorMessage + detailsMessage);
        } else if (status === 403) {
          setDeleteError(
            data.error || "No tienes permisos para eliminar transfers. Solo los administradores pueden realizar esta acción.",
          );
        } else if (status === 404) {
          setDeleteError(
            data.error || "El transfer no fue encontrado. Puede que ya haya sido eliminado.",
          );
        } else {
          const errorMessage = data.error || data.message || "Ocurrió un error al eliminar el transfer.";
          const detailsMessage = data.details ? ` ${data.details}` : "";
          setDeleteError(errorMessage + detailsMessage);
        }
      } else {
        setDeleteError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al eliminar el transfer. Intenta nuevamente.",
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async (data: UpdateTransferFormOutput) => {
    setServerError(null);
    setSuccess(null);

    try {
      const licensePlateNumber = parseInt(licensePlate, 10);
      const response = await transferService.updateTransfer(licensePlateNumber, {
        availability: data.availability,
        make: data.make,
        model: data.model,
        category: data.category,
        capacity: data.capacity,
        type: data.type,
        base_price: data.base_price,
        sale_price: data.sale_price,
        supplier_corporate: data.supplier_corporate,
      });

      if (response.success && response.data) {
        const updated: Transfer = response.data;
        setSuccess(`Transfer con placa ${updated.license_plate} actualizado correctamente.`);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setServerError(response.error || response.message || "No se pudo actualizar el transfer.");
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as ApiResponse;
        setServerError(
          data.message ||
            data.error ||
            "Ocurrió un error al actualizar el transfer. Intenta nuevamente.",
        );
      } else {
        setServerError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al actualizar el transfer. Intenta nuevamente.",
        );
      }
    }
  };

  const inputNumberClass =
    "bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100";

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-4xl rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
            Modificar transfer
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
              {/* Columna Izquierda */}
              <div className="space-y-5">
                {/* Placa de transfer */}
                <div className="space-y-2">
                  <Label htmlFor="license_plate" className="text-[#4A4A4A] font-semibold">
                    Placa de transfer
                  </Label>
                  <Input
                    id="license_plate"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Número de placa"
                    value={licensePlate}
                    className={inputNumberClass}
                    disabled
                  />
                </div>

                {/* Marca */}
                <div className="space-y-2">
                  <Label htmlFor="make" className="text-[#4A4A4A] font-semibold">
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

                {/* Modelo */}
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-[#4A4A4A] font-semibold">
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

                {/* Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#4A4A4A] font-semibold">
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

                {/* Capacidad */}
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-[#4A4A4A] font-semibold">
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

              {/* Columna Derecha */}
              <div className="space-y-5">
                {/* Proveedor */}
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
                        ? "Cargando proveedores..."
                        : "Seleccionar el proveedor del transfer"}
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.corporate} value={supplier.corporate.toString()}>
                        {supplier.company} ({supplier.corporate})
                      </option>
                    ))}
                  </select>
                  {errors.supplier_corporate && (
                    <p className="text-sm text-destructive">{errors.supplier_corporate.message}</p>
                  )}
                </div>

                {/* Disponibilidad */}
                <div className="space-y-2">
                  <Label htmlFor="availability" className="text-[#4A4A4A] font-semibold">
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

                {/* Tipo */}
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-[#4A4A4A] font-semibold">
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

                {/* Precio base */}
                <div className="space-y-2">
                  <Label htmlFor="base_price" className="text-[#4A4A4A] font-semibold">
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

                {/* Precio venta */}
                <div className="space-y-2">
                  <Label htmlFor="sale_price" className="text-[#4A4A4A] font-semibold">
                    Precio venta
                  </Label>
                  <Input
                    id="sale_price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Ingrese el precio venta del transfer"
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

            {/* Acciones */}
            <div className="mt-6 flex justify-between gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                disabled={isSubmitting || deleting}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="bg-transparent border-2 border-[#313833] text-[#313833] hover:bg-transparent hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || deleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#647a3a] text-white hover:bg-[#4f622d] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#647a3a]"
                  disabled={isSubmitting || deleting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </form>

          {/* Diálogo de confirmación de eliminación */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="bg-[#F2F1ED] border-2 border-red-200 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#1A1F1B] text-center">
                  ¿Eliminar transfer?
                </DialogTitle>
                <DialogDescription className="text-center text-[#4A4A4A] pt-2">
                  Estás a punto de eliminar el transfer con placa{" "}
                  <strong className="text-[#1A1F1B]">{licensePlate}</strong>.
                  <br />
                  <br />
                  <span className="text-red-600 font-medium">
                    Esta acción no se puede deshacer.
                  </span>
                  <br />
                  Si el transfer tiene reservas asociadas, no se podrá eliminar.
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter className="flex-row gap-3 justify-center sm:justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className="bg-transparent border-2 border-[#313833] text-[#313833] hover:bg-transparent hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};



