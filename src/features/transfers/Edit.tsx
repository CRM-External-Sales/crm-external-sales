"use client";

import { useState, useEffect } from "react";
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
import { transferService, supplierService, type ApiResponse, type Transfer, type Supplier } from "@/lib/api";

import { CheckCircle2 } from "lucide-react";

interface TransferFormState {
  license_plate: string;
  make: string;
  model: string;
  category: string;
  capacity: string;
  supplier_corporate: string;
  availability: string;
  type: string;
  base_price: string;
  sale_price: string;
}

interface EditTransferViewProps {
  transfer: Transfer;
  onCancel: () => void;
  onSuccess: () => void;
}

export const EditTransferView = ({ transfer, onCancel, onSuccess }: EditTransferViewProps) => {
  const [form, setForm] = useState<TransferFormState>({
    license_plate: transfer.license_plate.toString(),
    make: transfer.make,
    model: transfer.model,
    category: transfer.category,
    capacity: transfer.capacity.toString(),
    supplier_corporate: transfer.supplier_corporate.toString(),
    availability: transfer.availability,
    type: transfer.type,
    base_price: transfer.base_price.toString(),
    sale_price: transfer.sale_price.toString(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

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

  const handleChange =
    (field: keyof TransferFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

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
      const licensePlateNumber = parseInt(form.license_plate, 10);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validaciones
    const capacityNumber = parseInt(form.capacity, 10);
    if (!form.capacity || Number.isNaN(capacityNumber) || capacityNumber <= 0) {
      setError("La capacidad debe ser un número positivo.");
      return;
    }

    const basePriceNumber = parseFloat(form.base_price);
    if (!form.base_price || Number.isNaN(basePriceNumber) || basePriceNumber <= 0) {
      setError("El precio base debe ser un número positivo.");
      return;
    }

    const salePriceNumber = parseFloat(form.sale_price);
    if (!form.sale_price || Number.isNaN(salePriceNumber) || salePriceNumber <= 0) {
      setError("El precio de venta debe ser un número positivo.");
      return;
    }

    const supplierCorporateNumber = parseInt(form.supplier_corporate, 10);
    if (!form.supplier_corporate || Number.isNaN(supplierCorporateNumber) || supplierCorporateNumber <= 0) {
      setError("Debe seleccionar un proveedor.");
      return;
    }

    if (!form.make || !form.model || !form.category || !form.availability || !form.type) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    setSubmitting(true);

    try {
      const licensePlateNumber = parseInt(form.license_plate, 10);
      const response = await transferService.updateTransfer(licensePlateNumber, {
        availability: form.availability.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        category: form.category.trim(),
        capacity: capacityNumber,
        type: form.type.trim(),
        base_price: basePriceNumber,
        sale_price: salePriceNumber,
        supplier_corporate: supplierCorporateNumber,
      });

      if (response.success && response.data) {
        const updated: Transfer = response.data;
        setSuccess(`Transfer con placa ${updated.license_plate} actualizado correctamente.`);
        setError(null);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(response.error || response.message || "No se pudo actualizar el transfer.");
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
                "No tienes permisos para actualizar transfers. Solo los administradores pueden realizar esta acción.",
            );
            break;
          case 404:
            setError(
              data.error ||
                "El transfer no fue encontrado. Puede que ya haya sido eliminado o la placa sea incorrecta.",
            );
            break;
          case 409:
            setError(
              data.error ||
                "Ya existe un transfer con esa placa. Por favor, verifica los datos e intenta nuevamente.",
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
                "Ocurrió un error al actualizar el transfer. Intenta nuevamente.",
            );
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al actualizar el transfer. Intenta nuevamente.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-4xl rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
            Modificar transfer
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-6">
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
                    value={form.license_plate}
                    onChange={handleChange("license_plate")}
                    className="bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
                    required
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
                    value={form.make}
                    onChange={handleChange("make")}
                    required
                  />
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
                    value={form.model}
                    onChange={handleChange("model")}
                    required
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#4A4A4A] font-semibold">
                    Categoría
                  </Label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={handleChange("category")}
                    className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      form.category === "" ? "text-muted-foreground" : "text-foreground"
                    }`}
                    required
                  >
                    <option value="">Seleccionar la categoría del transfer</option>
                    <option value="Económico">Económico</option>
                    <option value="Comfort">Comfort</option>
                    <option value="Luxury">Luxury</option>
                    <option value="Premium">Premium</option>
                  </select>
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
                    value={form.capacity}
                    onChange={handleChange("capacity")}
                    className="bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
                    required
                  />
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
                    value={form.supplier_corporate}
                    onChange={handleChange("supplier_corporate")}
                    disabled={loadingSuppliers}
                    className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      form.supplier_corporate === "" ? "text-muted-foreground" : "text-foreground"
                    }`}
                    required
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
                </div>

                {/* Disponibilidad */}
                <div className="space-y-2">
                  <Label htmlFor="availability" className="text-[#4A4A4A] font-semibold">
                    Disponibilidad
                  </Label>
                  <select
                    id="availability"
                    value={form.availability}
                    onChange={handleChange("availability")}
                    className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      form.availability === "" ? "text-muted-foreground" : "text-foreground"
                    }`}
                    required
                  >
                    <option value="">Seleccionar la disponibilidad del transfer</option>
                    <option value="available">Disponible</option>
                    <option value="busy">Ocupado</option>
                    <option value="maintenance">En mantenimiento</option>
                    <option value="unavailable">No disponible</option>
                  </select>
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-[#4A4A4A] font-semibold">
                    Tipo
                  </Label>
                  <select
                    id="type"
                    value={form.type}
                    onChange={handleChange("type")}
                    className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      form.type === "" ? "text-muted-foreground" : "text-foreground"
                    }`}
                    required
                  >
                    <option value="">Seleccionar el tipo de transfer</option>
                    <option value="Van">Van</option>
                    <option value="Bus">Bus</option>
                    <option value="Car">Car</option>
                    <option value="SUV">SUV</option>
                  </select>
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
                    value={form.base_price}
                    onChange={handleChange("base_price")}
                    className="bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
                    required
                  />
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
                    value={form.sale_price}
                    onChange={handleChange("sale_price")}
                    className="bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
                    required
                  />
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
                disabled={submitting || deleting}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="bg-transparent border-2 border-[#313833] text-[#313833] hover:bg-transparent hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting || deleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#647a3a] text-white hover:bg-[#4f622d] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#647a3a]"
                  disabled={submitting || deleting}
                >
                  {submitting ? "Guardando..." : "Guardar"}
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
                  <strong className="text-[#1A1F1B]">{form.license_plate}</strong>.
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

