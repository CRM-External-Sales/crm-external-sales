import { useState, useEffect, useCallback } from "react";
import { supplierService, type Supplier, type ApiResponse } from "@/lib/api";
import { AxiosError } from "axios";

interface UseSuppliersParams {
  page?: number;
  limit?: number;
  company?: string;
  service?: string;
}

interface UseSuppliersReturn {
  suppliers: Supplier[];
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

export const useSuppliers = (params: UseSuppliersParams = {}): UseSuppliersReturn => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: ApiResponse<Supplier[]> = await supplierService.getSuppliers({
        page: params.page || 1,
        limit: params.limit || 5,
        company: params.company,
        service: params.service,
      });

      if (response.success && response.data) {
        setSuppliers(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error || "Error al cargar proveedores");
        setSuppliers([]);
      }
    } catch (err) {
      // Manejar errores de axios (400, 500, etc.)
      if (err instanceof AxiosError && err.response?.data) {
        const errorData = err.response.data as ApiResponse;
        setError(errorData.error || errorData.message || "Error al cargar proveedores");
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Error al cargar proveedores";
        setError(errorMessage);
      }
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.company, params.service]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return {
    suppliers,
    loading,
    error,
    pagination,
    refetch: fetchSuppliers,
  };
};