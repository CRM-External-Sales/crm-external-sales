import { useState, useEffect, useCallback } from "react";
import { userService, type User, type ApiResponse } from "@/lib/api";
import { isAxiosLikeError } from "@/lib/http-error";

interface UseUsersParams {
  page?: number;
  limit?: number;
  role?: "admin" | "agent" | "customer";
  search?: string;
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  refetch: () => Promise<void>;
}

export const useUsers = (params: UseUsersParams = {}): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: ApiResponse<User[]> = await userService.getUsers({
        page: params.page || 1,
        limit: params.limit || 5,
        role: params.role,
        search: params.search,
      });

      if (response.success && response.data) {
        setUsers(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error || "Error al cargar usuarios");
        setUsers([]);
      }
    } catch (err) {
      // Manejar errores de axios (400, 500, etc.)
      if (isAxiosLikeError(err) && err.response?.data) {
        const errorData = err.response.data as ApiResponse;
        setError(errorData.error || errorData.message || "Error al cargar usuarios");
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Error al cargar usuarios";
        setError(errorMessage);
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.role, params.search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    pagination,
    refetch: fetchUsers,
  };
};
