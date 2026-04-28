import { useState, useEffect, useCallback } from "react";
import { tourService, type Tour, type ApiResponse } from "@/lib/api";
import { isAxiosLikeError } from "@/lib/http-error";

interface UseToursParams {
  page?: number;
  limit?: number;
  type?: string;
  difficulty?: string;
  name?: string;
  availability?: string;
}

interface UseToursReturn {
  tours: Tour[];
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

export const useTours = (params: UseToursParams = {}): UseToursReturn => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchTours = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: ApiResponse<Tour[]> = await tourService.getTours({
        page: params.page || 1,
        limit: params.limit || 5,
        type: params.type,
        difficulty: params.difficulty,
        name: params.name,
        availability: params.availability,
      });

      if (response.success && response.data) {
        setTours(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error || "Error al cargar tours");
        setTours([]);
      }
    } catch (err) {
      // Manejar errores de axios (400, 500, etc.)
      if (isAxiosLikeError(err) && err.response?.data) {
        const errorData = err.response.data as ApiResponse;
        setError(errorData.error || errorData.message || "Error al cargar tours");
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Error al cargar tours";
        setError(errorMessage);
      }
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.type,
    params.difficulty,
    params.name,
    params.availability,
  ]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  return {
    tours,
    loading,
    error,
    pagination,
    refetch: fetchTours,
  };
};
