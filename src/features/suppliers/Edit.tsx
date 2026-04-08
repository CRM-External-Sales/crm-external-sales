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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supplierService, type ApiResponse, type Supplier } from "@/lib/api";
import { UpdateSupplierSchema } from "@/app/schemas/supplier.schema";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const editSupplierFormSchema = UpdateSupplierSchema.extend({
  corporate: z.coerce.number().int().positive("La identificación debe ser un número positivo."),
  company: z
    .string()
    .min(2, "El nombre de la compañía debe tener al menos 2 caracteres")
    .max(200, "El nombre de la compañía no puede exceder 200 caracteres"),
  phone: z
    .string()
    .min(7, "El teléfono debe tener al menos 7 caracteres")
    .max(30, "El teléfono no puede exceder 30 caracteres"),
  email: z.string().email("Debes proporcionar un email válido"),
  service: z
    .union([z.literal(""), z.literal("Tour"), z.literal("Transfer")])
    .refine((value) => value !== "", {
      message: "Seleccionar tipo de servicio",
    }),
});

type EditSupplierFormValues = z.infer<typeof editSupplierFormSchema>;
type EditSupplierFormInput = z.input<typeof editSupplierFormSchema>;

interface EditSupplierViewProps {
  supplier: Supplier;
  onCancel: () => void;
  onSuccess: () => void;
}

export const EditSupplierView = ({ supplier, onCancel, onSuccess }: EditSupplierViewProps) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditSupplierFormInput, unknown, EditSupplierFormValues>({
    resolver: zodResolver(editSupplierFormSchema),
    defaultValues: {
      corporate: supplier.corporate.toString(),
      company: supplier.company,
      phone: supplier.phone,
      email: supplier.email,
      service:
        supplier.service === "Tour" || supplier.service === "Transfer"
          ? supplier.service
          : "",
    },
  });

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
    setError(null);
    setSuccess(null);
    setDeleting(true);

    try {
      const response = await supplierService.deleteSupplier(supplier.corporate);

      if (response.success) {
        setDeleteDialogOpen(false);
        setSuccess("Proveedor eliminado correctamente.");
        toast.success("Proveedor eliminado correctamente.");
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setDeleteError(response.error || "No se pudo eliminar el proveedor.");
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as ApiResponse & { details?: string };
        const status = err.response.status;

        if (status === 409) {
          const errorMessage = data.error || "No se puede eliminar el proveedor porque tiene registros asociados.";
          const detailsMessage = data.details ? ` ${data.details}` : "";
          setDeleteError(errorMessage + detailsMessage);
        } else if (status === 403) {
          setDeleteError(
            data.error || "No tienes permisos para eliminar proveedores. Solo los administradores pueden realizar esta acción.",
          );
        } else if (status === 404) {
          setDeleteError(
            data.error || "El proveedor no fue encontrado. Puede que ya haya sido eliminado.",
          );
        } else {
          const errorMessage = data.error || data.message || "Ocurrió un error al eliminar el proveedor.";
          const detailsMessage = data.details ? ` ${data.details}` : "";
          setDeleteError(errorMessage + detailsMessage);
        }
      } else {
        setDeleteError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al eliminar el proveedor. Intenta nuevamente.",
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async (data: EditSupplierFormValues) => {
    setError(null);
    setSuccess(null);

    if (data.service !== "Tour" && data.service !== "Transfer") {
      setError("Seleccionar tipo de servicio");
      return;
    }

    try {
      const response = await supplierService.updateSupplier(data.corporate, {
        company: data.company.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        service: data.service,
      });

      if (response.success && response.data) {
        const updated: Supplier = response.data;
        const message = `Proveedor ${updated.company} actualizado correctamente.`;
        setSuccess(message);
        toast.success(message);
        setError(null);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(response.error || response.message || "No se pudo actualizar el proveedor.");
      }
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as ApiResponse;
        const status = err.response.status;

        switch (status) {
          case 400:
            setError(
              data.error ||
                "Los datos proporcionados no son válidos. Por favor, verifica los campos e intenta nuevamente.",
            );
            break;
          case 403:
            setError(
              data.error ||
                "No tienes permisos para actualizar proveedores. Solo los administradores pueden realizar esta acción.",
            );
            break;
          case 404:
            setError(
              data.error ||
                "El proveedor no fue encontrado. Puede que ya haya sido eliminado o la identificación sea incorrecta.",
            );
            break;
          case 409:
            setError(
              data.error ||
                "Ya existe un proveedor con ese email o teléfono. Por favor, verifica los datos e intenta nuevamente.",
            );
            break;
          case 500:
            setError(
              data.error ||
                "Error interno del servidor. Por favor, intenta nuevamente más tarde.",
            );
            break;
          default:
            setError(
              data.error ||
                data.message ||
                "Ocurrió un error al actualizar el proveedor. Intenta nuevamente.",
            );
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al actualizar el proveedor. Intenta nuevamente.",
        );
      }
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-4xl rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
            Modificar Proveedor
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
                disabled
              />
              {errors.corporate && <p className="text-red-500 text-xs font-medium">{errors.corporate.message}</p>}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">Nombre</Label>
              <Input
                id="company"
                type="text"
                placeholder="Ingrese el nombre del proveedor"
                {...register("company")}
              />
              {errors.company && <p className="text-red-500 text-xs font-medium">{errors.company.message}</p>}
            </div>

            {/* Correo */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">Correo</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ingrese el correo electrónico"
                {...register("email")}
              />
              {errors.email && <p className="text-red-500 text-xs font-medium">{errors.email.message}</p>}
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ingrese el número de teléfono"
                {...register("phone")}
              />
              {errors.phone && <p className="text-red-500 text-xs font-medium">{errors.phone.message}</p>}
            </div>

            {/* Servicio */}
            <div className="space-y-2">
              <Label htmlFor="service" className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']">Servicio</Label>
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
              {errors.service && <p className="text-red-500 text-xs font-medium">{errors.service.message}</p>}
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
                  ¿Eliminar proveedor?
                </DialogTitle>
                <DialogDescription className="text-center text-[#4A4A4A] pt-2">
                  Estás a punto de eliminar el proveedor{" "}
                  <strong className="text-[#1A1F1B]">{watch("company")}</strong> (Identificación: {String(watch("corporate") ?? supplier.corporate)}).
                  <br />
                  <br />
                  <span className="text-red-600 font-medium">
                    Esta acción no se puede deshacer.
                  </span>
                  <br />
                  Si el proveedor tiene tours o transfers asociados, no se podrá eliminar.
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
