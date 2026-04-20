"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { userService, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
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
import { MoreHorizontal, CheckCircle2, AlertCircle } from "lucide-react";

import { EditUserView } from "./Edit";

export const View = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Redirigir a editar el perfil propio si viene desde el sidebar
  useEffect(() => {
    if (searchParams.get("edit") === "me" && currentUser && !editingUser) {
      setEditingUser(currentUser);
      // Limpiar la URL para evitar que se quede pegado al recargar
      router.replace("/usuarios");
    }
  }, [searchParams, currentUser, router, editingUser]);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const limit = 5;

  // Formatear rol
  const formatRole = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "agent": return "Agente";
      case "customer": return "Cliente";
      default: return role;
    }
  };

  // Debounce del término de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const {
    users,
    loading,
    error,
    pagination,
    refetch,
  } = useUsers({
    page: currentPage,
    limit,
    search: debouncedSearchTerm.trim() || undefined,
    role: (roleFilter as any) || undefined,
  });

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, roleFilter]);


  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleEditSuccess = () => {
    setEditingUser(null);
    window.location.reload();
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await userService.deleteUser(userToDelete.username);
      
      if (response.success) {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        toast.success("Usuario eliminado correctamente.");
        await refetch();
      } else {
        setDeleteError(response.error || "No se pudo eliminar el usuario.");
      }
    } catch (err: unknown) {
      const e = err as any;
      if (e?.response?.data) {
        setDeleteError(e.response.data.error || e.response.data.message || "Error al eliminar el usuario.");
      } else {
        setDeleteError(err instanceof Error ? err.message : "Error al eliminar el usuario.");
      }
    } finally {
      setDeleting(false);
      // Si el componente de Edit fue el que gatilló el delete, lo cerramos
      if (editingUser?.username === userToDelete.username) {
        setEditingUser(null);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
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

  const handleRoleToggle = (role: string) => {
    setRoleFilter(prev => prev === role ? "" : role);
  };

  const canGoPrevious = currentPage > 1;
  const canGoNext = pagination && currentPage < pagination.totalPages;

  if (editingUser) {
    return (
      <EditUserView
        user={editingUser}
        onCancel={handleCancelEdit}
        onSuccess={handleEditSuccess}
        onDeleteRequest={() => handleDeleteUser(editingUser)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl rounded-xl bg-[#F2F1ED] p-6 shadow-lg">
        {/* Título */}
        <h1 className="mb-6 text-center text-2xl font-semibold text-[#3C4A22]">
          Lista de usuarios
        </h1>

        {/* Búsqueda */}
        <div className="mb-4">
          <Input
            id="search"
            type="text"
            placeholder="Búsqueda por nombre de usuario o correo"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white"
          />
        </div>

        {/* Filtros de Rol (Radio buttons behavior) */}
        <div className="mb-6 flex items-center gap-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <button
              type="button"
              role="radio"
              aria-checked={roleFilter === "admin"}
              onClick={() => handleRoleToggle("admin")}
              className="aspect-square h-4 w-4 rounded-full border border-primary bg-white text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center cursor-pointer hover:bg-accent"
            >
              {roleFilter === "admin" && (
                <div className="h-2.5 w-2.5 rounded-full bg-current" />
              )}
            </button>
            <span className="text-sm font-normal text-[#4A4A4A]">Administrador</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
             <button
              type="button"
              role="radio"
              aria-checked={roleFilter === "agent"}
              onClick={() => handleRoleToggle("agent")}
              className="aspect-square h-4 w-4 rounded-full border border-primary bg-white text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center cursor-pointer hover:bg-accent"
            >
              {roleFilter === "agent" && (
                <div className="h-2.5 w-2.5 rounded-full bg-current" />
              )}
            </button>
            <span className="text-sm font-normal text-[#4A4A4A]">Agente</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <button
              type="button"
              role="radio"
              aria-checked={roleFilter === "customer"}
              onClick={() => handleRoleToggle("customer")}
              className="aspect-square h-4 w-4 rounded-full border border-primary bg-white text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center cursor-pointer hover:bg-accent"
            >
              {roleFilter === "customer" && (
                <div className="h-2.5 w-2.5 rounded-full bg-current" />
              )}
            </button>
            <span className="text-sm font-normal text-[#4A4A4A]">Cliente</span>
          </label>
        </div>

        {/* Mensaje de error general de carga */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchTerm || roleFilter
                  ? "No se encontraron usuarios con los criterios de búsqueda"
                  : "No hay usuarios disponibles"}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 overflow-x-auto rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left font-semibold text-foreground px-4 py-3">
                      Nombre de usuario
                    </TableHead>
                    <TableHead className="text-left font-semibold text-foreground px-4 py-3">
                      Rol
                    </TableHead>
                    <TableHead className="text-left font-semibold text-foreground px-4 py-3">
                      Correo
                    </TableHead>
                    <TableHead className="text-left font-semibold text-foreground px-4 py-3">
                      Teléfono
                    </TableHead>
                    <TableHead className="w-[50px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id || user.username}>
                      <TableCell className="text-left px-4">{user.username}</TableCell>
                      <TableCell className="text-left px-4">{formatRole(user.role)}</TableCell>
                      <TableCell className="text-left px-4">{user.email}</TableCell>
                      <TableCell className="text-left px-4">{user.phone}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeleteUser(user)}
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
                Mostrando {users.length}{" "}
                {users.length === 1 ? "usuario" : "usuarios"}{" "}
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
                ¿Eliminar usuario?
              </DialogTitle>
              <DialogDescription className="text-center text-[#4A4A4A] pt-2">
                {userToDelete && (
                  <>
                    Estás a punto de eliminar el usuario{" "}
                    <strong className="text-[#1A1F1B]">{userToDelete.username}</strong>.
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
                <AlertCircle className="h-4 w-4" />
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
