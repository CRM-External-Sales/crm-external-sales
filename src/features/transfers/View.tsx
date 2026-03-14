"use client";

import { useState, useEffect } from "react";
import { useTransfers } from "@/hooks/useTransfers";
import { transferService, type Transfer, type ApiResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MoreHorizontal, CheckCircle2 } from "lucide-react";

import { EditTransferView } from "./Edit";

export const View = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransfers, setSelectedTransfers] = useState<number[]>([]);
  const [singleTransfer, setSingleTransfer] = useState<Transfer | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<Transfer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const limit = 5;

  // Debounce del término de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Determinar si buscar por placa (numérico)
  const isNumericSearch = debouncedSearchTerm ? /^\d+$/.test(debouncedSearchTerm.trim()) : false;

  // Usar el hook para búsqueda normal (por make)
  const shouldSearchByMake = 
    debouncedSearchTerm && 
    !isNumericSearch && 
    debouncedSearchTerm.trim().length >= 1;

  const {
    transfers,
    loading,
    error,
    pagination,
    refetch,
  } = useTransfers({
    page: currentPage,
    limit,
    make: shouldSearchByMake ? debouncedSearchTerm.trim() : undefined,
    category: categoryFilter || undefined,
    availability: availabilityFilter || undefined,
    type: typeFilter || undefined,
  });

  // Función para buscar por placa
  const searchByLicensePlate = async (licensePlate: string) => {
    if (!licensePlate.trim()) {
      setSingleTransfer(null);
      setSearchError(null);
      return;
    }

    const licensePlateNum = parseInt(licensePlate, 10);
    if (isNaN(licensePlateNum)) {
      setSearchError("La placa debe ser un número");
      setSingleTransfer(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await transferService.getTransferByLicensePlate(licensePlateNum);
      if (response.success && response.data) {
        setSingleTransfer(response.data);
        setSearchError(null);
      } else {
        setSingleTransfer(null);
        setSearchError(response.error || "Transfer no encontrado");
      }
    } catch (err) {
      setSingleTransfer(null);
      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          setSearchError(null);
          return;
        }
        const errorData = err.response?.data as ApiResponse | undefined;
        setSearchError(
          errorData?.error ||
            errorData?.message ||
            "Error al buscar transfer",
        );
        return;
      }
      setSearchError(err instanceof Error ? err.message : "Error al buscar transfer");
    } finally {
      setSearchLoading(false);
    }
  };

  // Manejar búsqueda por placa cuando el término debounced cambia
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      if (isNumericSearch) {
        searchByLicensePlate(debouncedSearchTerm.trim());
      } else {
        setCurrentPage(1);
        setSingleTransfer(null);
        setSearchError(null);
      }
    } else {
      setSingleTransfer(null);
      setSearchError(null);
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, isNumericSearch]);

  // Resetear cuando cambian los filtros
  useEffect(() => {
    if (debouncedSearchTerm?.trim() && isNumericSearch) {
      searchByLicensePlate(debouncedSearchTerm.trim());
      return;
    }
    setCurrentPage(1);
    setSingleTransfer(null);
  }, [categoryFilter, availabilityFilter, makeFilter, typeFilter, debouncedSearchTerm, isNumericSearch]);

  // Filtrar transfer único si hay filtros aplicados
  const filteredSingleTransfer =
    singleTransfer && (categoryFilter || availabilityFilter || makeFilter || typeFilter)
      ? (categoryFilter ? singleTransfer.category === categoryFilter : true) &&
        (availabilityFilter ? singleTransfer.availability === availabilityFilter : true) &&
        (makeFilter ? singleTransfer.make === makeFilter : true) &&
        (typeFilter ? singleTransfer.type === typeFilter : true)
        ? singleTransfer
        : null
      : singleTransfer;

  const isIdSearchActive = !!debouncedSearchTerm?.trim() && isNumericSearch;
  const displayTransfers = filteredSingleTransfer
    ? [filteredSingleTransfer]
    : isIdSearchActive
      ? []
      : transfers;
  const isLoading = loading || searchLoading;
  const displayError = error || searchError;

  // Manejo de selección de filas
  const handleSelectTransfer = (licensePlate: number) => {
    setSelectedTransfers((prev) =>
      prev.includes(licensePlate)
        ? prev.filter((id) => id !== licensePlate)
        : [...prev, licensePlate]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransfers.length === displayTransfers.length) {
      setSelectedTransfers([]);
    } else {
      setSelectedTransfers(displayTransfers.map((t) => t.license_plate));
    }
  };

  const handleEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer);
  };

  const handleCancelEdit = () => {
    setEditingTransfer(null);
  };

  const handleEditSuccess = () => {
    setEditingTransfer(null);
    refetch();
  };

  const handleDeleteTransfer = (transfer: Transfer) => {
    setTransferToDelete(transfer);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transferToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await transferService.deleteTransfer(transferToDelete.license_plate);
      
      if (response.success) {
        setDeleteDialogOpen(false);
        setTransferToDelete(null);
        setDeleteSuccess("Transfer eliminado correctamente.");
        await refetch();
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 3000);
      } else {
        setDeleteError(response.error || "No se pudo eliminar el transfer");
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

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTransferToDelete(null);
    setDeleteError(null);
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !singleTransfer) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (pagination && currentPage < pagination.totalPages && !singleTransfer) {
      setCurrentPage(currentPage + 1);
    }
  };

  const canGoPrevious = currentPage > 1 && !singleTransfer;
  const canGoNext =
    pagination && currentPage < pagination.totalPages && !singleTransfer;

  // Si hay un transfer en edición, mostrar el formulario de edición
  if (editingTransfer) {
    return (
      <EditTransferView
        transfer={editingTransfer}
        onCancel={handleCancelEdit}
        onSuccess={handleEditSuccess}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
      {/* Título */}
      <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
        Lista de transfers
      </h1>

      {/* Búsqueda y Filtros */}
      <div className="mb-6 space-y-4">
        {/* Búsqueda */}
        <div>
          <Label htmlFor="search" className="mb-2 block text-sm font-medium">
            Búsqueda por número de placa, capacidad o proveedor
          </Label>
          <Input
            id="search"
            type="text"
            placeholder="Búsqueda por número de placa, capacidad o proveedor"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Marca</Label>
            <Input
              type="text"
              placeholder="Filtrar por marca..."
              value={makeFilter}
              onChange={(e) => {
                setMakeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">Categoría</Label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
                setSingleTransfer(null);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
            >
              <option value="">Todas las categorías</option>
              <option value="Económico">Económico</option>
              <option value="Comfort">Comfort</option>
              <option value="Luxury">Luxury</option>
              <option value="Premium">Premium</option>
            </select>
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">Disponibilidad</Label>
            <select
              value={availabilityFilter}
              onChange={(e) => {
                setAvailabilityFilter(e.target.value);
                setCurrentPage(1);
                setSingleTransfer(null);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
            >
              <option value="">Todas las disponibilidades</option>
              <option value="available">Disponible</option>
              <option value="busy">Ocupado</option>
              <option value="maintenance">En mantenimiento</option>
              <option value="unavailable">No disponible</option>
            </select>
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">Tipo</Label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
                setSingleTransfer(null);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
            >
              <option value="">Todos los tipos</option>
              <option value="Van">Van</option>
              <option value="Bus">Bus</option>
              <option value="Car">Car</option>
              <option value="SUV">SUV</option>
            </select>
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
          <p className="text-muted-foreground">Cargando transfers...</p>
        </div>
      ) : displayTransfers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            {isIdSearchActive
              ? categoryFilter || availabilityFilter || makeFilter || typeFilter
                ? `No se encontró un transfer con esa placa para los filtros seleccionados.`
                : "No se encontró un transfer con esa placa."
              : searchTerm
                ? "No se encontraron transfers con los criterios de búsqueda"
                : "No hay transfers disponibles"}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    <input
                      type="checkbox"
                      checked={selectedTransfers.length === displayTransfers.length && displayTransfers.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Placa
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Marca
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Modelo
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Categoría
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Capacidad
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Proveedor
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Tipo
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Disponibilidad
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Precio base
                  </TableHead>
                  <TableHead className="w-[50px] text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTransfers.map((transfer: Transfer) => (
                  <TableRow key={transfer.license_plate}>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedTransfers.includes(transfer.license_plate)}
                        onChange={() => handleSelectTransfer(transfer.license_plate)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {transfer.license_plate.toString()}
                    </TableCell>
                    <TableCell className="text-center">{transfer.make}</TableCell>
                    <TableCell className="text-center">{transfer.model}</TableCell>
                    <TableCell className="text-center">{transfer.category}</TableCell>
                    <TableCell className="text-center">{transfer.capacity.toString()}</TableCell>
                    <TableCell className="text-center">
                      {transfer.supplier?.company || "-"}
                    </TableCell>
                    <TableCell className="text-center">{transfer.type}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          transfer.availability === "available"
                            ? "bg-green-100 text-green-800"
                            : transfer.availability === "busy"
                              ? "bg-red-100 text-red-800"
                              : transfer.availability === "maintenance"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {transfer.availability === "available"
                          ? "Disponible"
                          : transfer.availability === "busy"
                            ? "Ocupado"
                            : transfer.availability === "maintenance"
                              ? "Mantenimiento"
                              : "No disponible"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      ${parseFloat(transfer.base_price.toString()).toLocaleString("es-CR")}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleEditTransfer(transfer)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDeleteTransfer(transfer)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Información de selección */}
          <div className="mb-4 text-sm text-muted-foreground">
            {selectedTransfers.length} de {displayTransfers.length} fila(s) seleccionada(s).
          </div>

          {/* Paginación */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="bg-[#3B7F73] text-white hover:bg-[#2d5f55] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#3B7F73]"
            >
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canGoNext}
              className="bg-[#607536] text-white hover:bg-[#4a5c2a] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#607536]"
            >
              Siguiente
            </Button>
          </div>
        </>
      )}

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#F2F1ED] border-2 border-red-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1A1F1B] text-center">
              ¿Eliminar transfer?
            </DialogTitle>
            <DialogDescription className="text-center text-[#4A4A4A] pt-2">
              {transferToDelete && (
                <>
                  Estás a punto de eliminar el transfer con placa{" "}
                  <strong className="text-[#1A1F1B]">{transferToDelete.license_plate.toString()}</strong>.
                  <br />
                  <br />
                  <span className="text-red-600 font-medium">
                    Esta acción no se puede deshacer.
                  </span>
                  <br />
                  Si el transfer tiene reservas asociadas, no se podrá eliminar.
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
    </div>
  );
};

