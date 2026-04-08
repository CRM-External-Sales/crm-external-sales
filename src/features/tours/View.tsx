"use client";

import { useState, useEffect } from "react";
import { useTours } from "@/hooks/useTours";
import { tourService, type Tour, type ApiResponse } from "@/lib/api";
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
import { toast } from "sonner";

import { EditTourView } from "./Edit";

export const View = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<Tour | null>(null);
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

  const {
    tours,
    loading,
    error,
    pagination,
    refetch,
  } = useTours({
    page: currentPage,
    limit,
    name: debouncedSearchTerm.trim() || undefined,
    type: typeFilter || undefined,
    difficulty: difficultyFilter || undefined,
    availability: availabilityFilter || undefined,
  });

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, typeFilter, difficultyFilter, availabilityFilter]);


  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
  };

  const handleCancelEdit = () => {
    setEditingTour(null);
  };

  const handleEditSuccess = () => {
    setEditingTour(null);
    window.location.reload();
  };

  const handleDeleteTour = (tour: Tour) => {
    setTourToDelete(tour);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tourToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await tourService.deleteTour(tourToDelete.id_tour);
      
      if (response.success) {
        setDeleteDialogOpen(false);
        setTourToDelete(null);
        setDeleteSuccess("Tour eliminado correctamente.");
        toast.success("Tour eliminado correctamente.");
        await refetch();
        setTimeout(() => setDeleteSuccess(null), 3000);
      } else {
        setDeleteError(response.error || "No se pudo eliminar el tour.");
      }
    } catch (err: unknown) {
      const e = err as any;
      if (e?.response?.data) {
        setDeleteError(e.response.data.error || e.response.data.message || "Error al eliminar el tour.");
      } else {
        setDeleteError(err instanceof Error ? err.message : "Error al eliminar el tour.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTourToDelete(null);
    setDeleteError(null);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const canGoPrevious = currentPage > 1;
  const canGoNext = pagination && currentPage < pagination.totalPages;

  if (editingTour) {
    return (
      <EditTourView
        tour={editingTour}
        onCancel={handleCancelEdit}
        onSuccess={handleEditSuccess}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
        {/* Título */}
        <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
          Lista de tours
        </h1>

        {/* Búsqueda */}
        <div className="mb-4">
          <Input
            id="search"
            type="text"
            placeholder="Búsqueda por nombre de tour o proveedor"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white"
          />
        </div>

        {/* Filtros */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-3/5">
            <select
              title="Filtrar por tipo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!typeFilter ? "text-muted-foreground" : ""}`}
            >
              <option value="">Tipo</option>
              <option value="Aventura">Aventura</option>
              <option value="Cultural">Cultural</option>
              <option value="Naturaleza">Naturaleza</option>
              <option value="Relax">Relax</option>
            </select>

            <select
              title="Filtrar por dificultad"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className={`flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!difficultyFilter ? "text-muted-foreground" : ""}`}
            >
              <option value="">Dificultad</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>

            <select
              title="Filtrar por disponibilidad"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className={`flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!availabilityFilter ? "text-muted-foreground" : ""}`}
            >
              <option value="">Disponibilidad</option>
              <option value="Disponible">Disponible</option>
              <option value="No disponible">No disponible</option>
            </select>
        </div>

        {/* Mensaje de error general de carga */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando tours...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchTerm || typeFilter || difficultyFilter || availabilityFilter
                  ? "No se encontraron tours con los criterios de búsqueda"
                  : "No hay tours disponibles"}
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
                    <TableHead className="text-center font-semibold text-foreground whitespace-nowrap">
                      Nombre
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Tipo
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Dificultad
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Espacios
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Duración
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Proveedor
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground whitespace-nowrap">
                      Disponibilidad
                    </TableHead>
                    <TableHead className="text-center font-semibold text-foreground">
                      Precio
                    </TableHead>
                    <TableHead className="w-[50px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tours.map((tour: Tour) => (
                    <TableRow key={tour.id_tour}>
                      <TableCell className="text-center text-sm font-medium">
                        {String(tour.id_tour).substring(0, 8)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">{tour.name}</TableCell>
                      <TableCell className="text-center">{tour.type}</TableCell>
                      <TableCell className="text-center">{tour.difficulty}</TableCell>
                      <TableCell className="text-center">{tour.spots}</TableCell>
                      <TableCell className="text-center">{tour.duration}</TableCell>
                      <TableCell className="text-center">{tour.supplier?.company || `Prov ${tour.supplier_corporate}`}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                            tour.availability === "Disponible"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tour.availability}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        ${typeof tour.base_price === 'string' ? parseFloat(tour.base_price).toFixed(2) : tour.base_price.toFixed(2)}
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
                            <DropdownMenuItem onClick={() => handleEditTour(tour)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeleteTour(tour)}
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
              <div className="text-sm text-muted-foreground w-full text-left">
                Mostrando {tours.length} {tours.length === 1 ? "tour" : "tours"}{" "}
                {pagination && `• Página ${currentPage} de ${pagination.totalPages}`}
              </div>

              {/* Paginación */}
              <div className="flex justify-end gap-2 w-full">
                <Button
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="bg-[#647a3a]/80 text-white hover:bg-[#647a3a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="bg-[#647a3a] text-white hover:bg-[#4f622d] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Diálogo de confirmación de eliminación */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-[#F2F1ED] border-2 border-red-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#1A1F1B] text-center">
                ¿Eliminar tour?
              </DialogTitle>
              <DialogDescription className="text-center text-[#4A4A4A] pt-2">
                {tourToDelete && (
                  <>
                    Estás a punto de eliminar el tour{" "}
                    <strong className="text-[#1A1F1B]">{tourToDelete.name}</strong>.
                    <br />
                    <br />
                    <span className="text-red-600 font-medium">
                      Esta acción no se puede deshacer.
                    </span>
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
