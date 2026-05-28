"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosLikeError } from "@/lib/http-error";
import * as z from "zod";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAuth } from "@/hooks/useAuth";
import { supplierService, type Supplier, type ApiResponse } from "@/lib/api";
import { canManageCatalog } from "@/lib/role-permissions";
import { useFormDraft } from "@/hooks/useFormDraft";
import { formDraftKeys } from "@/lib/form-draft-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SupplierQuerySchema } from "@/app/schemas/supplier.schema";
import { MoreHorizontal, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { EditSupplierView } from "./Edit";

const supplierViewFiltersSchema = SupplierQuerySchema.pick({
  company: true,
  service: true,
}).extend({
  company: z.string().default(""),
  service: z.union([z.literal(""), z.literal("Tour"), z.literal("Transfer")]).default(""),
});

type SupplierViewFilters = z.infer<typeof supplierViewFiltersSchema>;
type SupplierViewFiltersInput = z.input<typeof supplierViewFiltersSchema>;

export const View = () => {
  const { user } = useAuth();
  const canCrudCatalog = canManageCatalog(user?.role);

  const supplierFilterDefaults = {
    company: "",
    service: "" as "" | "Tour" | "Transfer",
  };

  const {
    register,
    watch,
    reset,
    getValues,
    setValue,
  } = useForm<SupplierViewFiltersInput, unknown, SupplierViewFilters>({
    resolver: zodResolver(supplierViewFiltersSchema),
    defaultValues: supplierFilterDefaults,
  });

  useFormDraft({
    draftKey: formDraftKeys.suppliers.filters,
    form: { watch, reset, getValues },
    defaultValues: supplierFilterDefaults,
    restoreMessage: false,
  });

  const searchTerm = watch("company") ?? "";
  const serviceFilter = watch("service") ?? "";
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [singleSupplier, setSingleSupplier] = useState<Supplier | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const normalizeService = (value: string) => value.trim().toLowerCase();
  const formatServiceLabel = (value: string) => {
    const normalized = normalizeService(value);
    if (normalized.startsWith("tour")) return "Tour";
    if (normalized.startsWith("transfer")) return "Transfer";
    // fallback: capitalizar primera letra
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : value;
  };

  // Debounce del término de búsqueda para evitar múltiples llamadas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Determinar si buscar por corporate o por nombre (usando el término debounced)
  const isNumericSearch = debouncedSearchTerm ? /^\d+$/.test(debouncedSearchTerm.trim()) : false;

  // Usar el hook para búsqueda normal (por nombre/company)
  // Solo enviar búsqueda si tiene al menos 1 carácter
  const shouldSearchByCompany =
    !isNumericSearch &&
    debouncedSearchTerm.trim().length >= 1;

  const {
    suppliers,
    loading,
    error,
    pagination,
    refetch,
  } = useSuppliers({
    page: currentPage,
    limit,
    company: shouldSearchByCompany ? debouncedSearchTerm.trim() : undefined,
    service: serviceFilter || undefined,
  });

  // Función para buscar por corporate
  const searchByCorporateId = async (corporate: string) => {
    if (!corporate.trim()) {
      setSingleSupplier(null);
      setSearchError(null);
      return;
    }

    const corporateNum = parseInt(corporate, 10);
    if (isNaN(corporateNum)) {
      setSearchError("La identificación debe ser un número");
      setSingleSupplier(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await supplierService.getSupplierByCorporate(corporateNum);
      if (response.success && response.data) {
        setSingleSupplier(response.data);
        setSearchError(null);
      } else {
        setSingleSupplier(null);
        setSearchError(response.error || "Proveedor no encontrado");
      }
    } catch (err) {
      setSingleSupplier(null);
      // Si es 404, tratarlo como "no encontrado"
      if (isAxiosLikeError(err)) {
        if (err.response?.status === 404) {
          setSearchError(null);
          return;
        }

        const errorData = err.response?.data as ApiResponse | undefined;
        setSearchError(
          errorData?.error ||
            errorData?.message ||
            "Error al buscar proveedor",
        );
        return;
      }

      setSearchError(err instanceof Error ? err.message : "Error al buscar proveedor");
    } finally {
      setSearchLoading(false);
    }
  };

  // Manejar búsqueda por corporate cuando el término debounced cambia
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      if (isNumericSearch) {
        // Buscar por corporate usando endpoint específico
        searchByCorporateId(debouncedSearchTerm.trim());
      } else {
        // Buscar por nombre (usando el hook)
        setCurrentPage(1);
        setSingleSupplier(null);
        setSearchError(null);
      }
    } else {
      setSingleSupplier(null);
      setSearchError(null);
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, isNumericSearch]);

  // Resetear cuando cambia el filtro de servicio
  useEffect(() => {
    // Si estamos buscando por identificación, volver a ejecutar la búsqueda para revalidar con el filtro
    if (debouncedSearchTerm?.trim() && isNumericSearch) {
      searchByCorporateId(debouncedSearchTerm.trim());
      return;
    }

    setCurrentPage(1);
    setSingleSupplier(null);
  }, [serviceFilter, debouncedSearchTerm, isNumericSearch]);

  // Determinar qué datos mostrar
  const filteredSingleSupplier =
    singleSupplier && serviceFilter
      ? normalizeService(singleSupplier.service) === normalizeService(serviceFilter)
        ? singleSupplier
        : null
      : singleSupplier;

  const isIdSearchActive = !!debouncedSearchTerm?.trim() && isNumericSearch;
  const displaySuppliers = filteredSingleSupplier
    ? [filteredSingleSupplier]
    : isIdSearchActive
      ? []
      : suppliers;
  const isLoading = loading || searchLoading;
  const displayError = error || searchError;

  // Calcular total de registros
  const totalRecords = filteredSingleSupplier
    ? 1
    : pagination?.total || displaySuppliers.length;

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
  };

  const handleCancelEdit = () => {
    setEditingSupplier(null);
  };

  const handleEditSuccess = () => {
    setEditingSupplier(null);
    // Recargar la lista de proveedores
    window.location.reload();
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await supplierService.deleteSupplier(supplierToDelete.corporate);
      
      if (response.success) {
        setDeleteDialogOpen(false);
        setSupplierToDelete(null);
        setDeleteSuccess("Proveedor eliminado correctamente.");
        toast.success("Proveedor eliminado correctamente.");
        // Recargar la lista de proveedores
        await refetch();
        // Limpiar el mensaje de éxito después de 3 segundos
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 3000);
      } else {
        setDeleteError(response.error || "No se pudo eliminar el proveedor");
      }
    } catch (err) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const data = err.response.data as ApiResponse & { details?: string };
        const status = err.response.status;

        // Manejar específicamente el error 409 (Conflict - tiene dependencias)
        if (status === 409) {
          const errorMessage = data.error || "No se puede eliminar el proveedor porque tiene registros asociados.";
          const detailsMessage = data.details ? ` ${data.details}` : "";
          setDeleteError(errorMessage + detailsMessage);
        } else if (status === 403) {
          // Sin permisos (solo admin)
          setDeleteError(
            data.error || "No tienes permisos para eliminar proveedores. Solo los administradores pueden realizar esta acción.",
          );
        } else if (status === 404) {
          // Supplier no encontrado
          setDeleteError(
            data.error || "El proveedor no fue encontrado. Puede que ya haya sido eliminado.",
          );
        } else {
          // Otros errores
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

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSupplierToDelete(null);
    setDeleteError(null);
  };

  // Si hay un proveedor en edición, mostrar el formulario de edición (solo administración de catálogo)
  if (editingSupplier && canCrudCatalog) {
    return (
      <EditSupplierView
        supplier={editingSupplier}
        onCancel={handleCancelEdit}
        onSuccess={handleEditSuccess}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
        {/* Título */}
        <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
          {canCrudCatalog ? "Lista de Proveedores" : "Consulta de Proveedores"}
        </h1>

        {/* Búsqueda */}
        <div className="mb-4">
          <Label htmlFor="search" className="mb-2 block text-sm font-medium">
            Búsqueda por identificación o nombre
          </Label>
          <Input
            id="search"
            type="text"
            placeholder="Buscar por identificación o nombre..."
            value={searchTerm}
            {...register("company")}
            className="w-full"
          />
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <Label className="mb-2 block text-sm font-medium">Filtrar por servicio</Label>
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                role="radio"
                aria-checked={serviceFilter === "Tour"}
                onClick={() => {
                  // Si ya está seleccionado, deseleccionar; si no, seleccionar
                  setValue("service", serviceFilter === "Tour" ? "" : "Tour");
                  setCurrentPage(1);
                  setSingleSupplier(null);
                }}
                className="aspect-square h-4 w-4 rounded-full border border-primary bg-white text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center cursor-pointer hover:bg-accent"
              >
                {serviceFilter === "Tour" && (
                  <div className="h-2.5 w-2.5 rounded-full bg-current" />
                )}
              </button>
              <Label htmlFor="tour" className="cursor-pointer font-normal">
                Tour
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                role="radio"
                aria-checked={serviceFilter === "Transfer"}
                onClick={() => {
                  // Si ya está seleccionado, deseleccionar; si no, seleccionar
                  setValue("service", serviceFilter === "Transfer" ? "" : "Transfer");
                  setCurrentPage(1);
                  setSingleSupplier(null);
                }}
                className="aspect-square h-4 w-4 rounded-full border border-primary bg-white text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center cursor-pointer hover:bg-accent"
              >
                {serviceFilter === "Transfer" && (
                  <div className="h-2.5 w-2.5 rounded-full bg-current" />
                )}
              </button>
              <Label htmlFor="transfer" className="cursor-pointer font-normal">
                Transfer
              </Label>
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {displayError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {displayError}
          </div>
        )}

        {/* Mensaje de éxito al eliminar */}
        {deleteSuccess && (
          <Alert variant="success" className="mb-4">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <AlertDescription>{deleteSuccess}</AlertDescription>
          </Alert>
        )}

        {/* Tabla */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando proveedores...</p>
          </div>
        ) : displaySuppliers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {isIdSearchActive
                ? serviceFilter
                  ? `No se encontró un proveedor con esa identificación para el servicio "${serviceFilter}".`
                  : "No se encontró un proveedor con esa identificación."
                : searchTerm
                  ? "No se encontraron proveedores con los criterios de búsqueda"
                  : "No hay proveedores disponibles"}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 overflow-x-auto rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center font-semibold text-foreground">
                      Identificación
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Nombre
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Correo
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Teléfono
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Servicio
                    </TableHead>
                    {canCrudCatalog && (
                    <TableHead className="w-[50px] text-center"></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displaySuppliers.map((supplier: Supplier) => (
                    <TableRow key={supplier.corporate}>
                      <TableCell className="text-center">
                        {supplier.corporate.toString()}
                      </TableCell>
                      <TableCell className="text-center">{supplier.company}</TableCell>
                      <TableCell className="text-center">{supplier.email}</TableCell>
                      <TableCell className="text-center">{supplier.phone}</TableCell>
                      <TableCell className="text-center">
                        {formatServiceLabel(supplier.service)}
                      </TableCell>
                      {canCrudCatalog && (
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                              aria-label="Más opciones"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeleteSupplier(supplier)}
                            >
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationControls
              page={currentPage}
              limit={limit}
              total={totalRecords}
              disabled={Boolean(singleSupplier || isIdSearchActive)}
              onPageChange={setCurrentPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setCurrentPage(1);
              }}
            />
          </>
        )}

        {/* Diálogo de confirmación de eliminación */}
        {canCrudCatalog && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-[#F2F1ED] border-2 border-red-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#1A1F1B] text-center">
                ¿Eliminar proveedor?
              </DialogTitle>
              <DialogDescription className="text-center text-[#4A4A4A] pt-2">
                {supplierToDelete && (
                  <>
                    Estás a punto de eliminar el proveedor{" "}
                    <strong className="text-[#1A1F1B]">{supplierToDelete.company}</strong> (Identificación: {supplierToDelete.corporate.toString()}).
                    <br />
                    <br />
                    <span className="text-red-600 font-medium">
                      Esta acción no se puede deshacer.
                    </span>
                    <br />
                    Si el proveedor tiene tours o transfers asociados, no se podrá eliminar.
                  </>
                )}
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
        )}
    </div>
  );
};

