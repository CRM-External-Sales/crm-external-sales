import { useState, useEffect, useCallback } from "react";
import { reservationService, type Reservation, type ApiResponse } from "@/lib/api";
import { isAxiosLikeError } from "@/lib/http-error";

export function useReservation(reservationId: number | null) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (reservationId == null || Number.isNaN(reservationId)) {
      setReservation(null);
      setError("ID de reserva inválido");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: ApiResponse<Reservation> =
        await reservationService.getReservationById(reservationId);
      if (res.success && res.data) {
        setReservation(res.data);
      } else {
        setError(res.error || "No se pudo cargar la reserva");
        setReservation(null);
      }
    } catch (err) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const d = err.response.data as ApiResponse;
        setError(d.error || d.message || "Error al cargar la reserva");
      } else {
        setError(err instanceof Error ? err.message : "Error al cargar la reserva");
      }
      setReservation(null);
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { reservation, setReservation, loading, error, refetch };
}
