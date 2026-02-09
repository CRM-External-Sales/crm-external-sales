import { useState, useEffect, useCallback } from "react";
import { transferService, type Transfer, type ApiResponse } from "@/lib/api";
import { AxiosError } from "axios";

interface UseTransfersParams {
  page?: number;
  limit?: number;
  make?: string;
  category?: string;
  availability?: string;
  type?: string;
}

interface UseTransfersReturn {
  transfers: Transfer[];
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

export const useTransfers = (params: UseTransfersParams = {}): UseTransfersReturn => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: ApiResponse<Transfer[]> = await transferService.getTransfers({
        page: params.page || 1,
        limit: params.limit || 5,
        make: params.make,
        category: params.category,
        availability: params.availability,
        type: params.type,
      });

      if (response.success && response.data) {
        setTransfers(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error || "Error al cargar transfers");
        setTransfers([]);
      }
    } catch (err) {
      // Manejar errores de axios (400, 500, etc.)
      if (err instanceof AxiosError && err.response?.data) {
        const errorData = err.response.data as ApiResponse;
        setError(errorData.error || errorData.message || "Error al cargar transfers");
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Error al cargar transfers";
        setError(errorMessage);
      }
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.make, params.category, params.availability, params.type]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  return {
    transfers,
    loading,
    error,
    pagination,
    refetch: fetchTransfers,
  };
};

