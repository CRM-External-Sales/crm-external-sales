import { useState, useEffect, useCallback } from "react";
import { reservationService, type Reservation, type ApiResponse } from "@/lib/api";
import { isAxiosLikeError } from "@/lib/http-error";

interface UseReservationsParams {
  page?: number;
  limit?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  state?: string;
  transfer_id?: string;
  q?: string;
}

interface UseReservationsReturn {
  reservations: Reservation[];
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

export const useReservations = (
  params: UseReservationsParams = {},
): UseReservationsReturn => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] =
    useState<UseReservationsReturn["pagination"]>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Reservation[]> =
        await reservationService.getReservations({
          page: params.page || 1,
          limit: params.limit || 5,
          date: params.date,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          state: params.state,
          transfer_id: params.transfer_id,
          q: params.q,
        });
      if (response.success && response.data) {
        setReservations(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        } else {
          setPagination(null);
        }
      } else {
        setError(response.error || "Error al cargar reservas");
        setReservations([]);
        setPagination(null);
      }
    } catch (err) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const errorData = err.response.data as ApiResponse;
        setError(errorData.error || errorData.message || "Error al cargar reservas");
      } else {
        setError(err instanceof Error ? err.message : "Error al cargar reservas");
      }
      setReservations([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.date,
    params.dateFrom,
    params.dateTo,
    params.state,
    params.transfer_id,
    params.q,
  ]);

  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  return { reservations, loading, error, pagination, refetch: fetchReservations };
};
