import { useState, useEffect, useCallback } from "react";
import {
  tourService,
  type Tour,
  type TourImage,
  type ApiResponse,
} from "@/lib/api";
import { isAxiosLikeError } from "@/lib/http-error";
import { resolveTourImageUrl } from "@/lib/tour-image-url";

export type TourDetail = Tour & {
  tour_schedule?: Array<{
    id: string;
    tour_id: string;
    weekday: string;
    start_time: string;
  }>;
};

export type TourDetailImage = TourImage & {
  displayUrl: string;
};

function buildDisplayImages(
  tour: TourDetail | null,
  signedImages: TourImage[],
): TourDetailImage[] {
  const byId = new Map<string, TourImage>();
  for (const img of signedImages) {
    byId.set(String(img.id), img);
  }

  const source = tour?.tour_image?.length ? tour.tour_image : signedImages;
  const sorted = [...source].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const result: TourDetailImage[] = [];
  for (const img of sorted) {
    const signed = byId.get(String(img.id));
    const displayUrl =
      signed?.publicUrl ??
      img.publicUrl ??
      resolveTourImageUrl(signed?.path ?? img.path);
    if (!displayUrl) continue;
    result.push({ ...(signed ?? img), displayUrl });
  }

  return result;
}

export function useTour(tourId: string | null) {
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [images, setImages] = useState<TourDetailImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tourId?.trim()) {
      setTour(null);
      setImages([]);
      setError("ID de tour inválido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [tourRes, imagesRes] = await Promise.all([
        tourService.getTourById(tourId),
        tourService.getTourImages(tourId),
      ]);

      if (!tourRes.success || !tourRes.data) {
        setTour(null);
        setImages([]);
        setError(tourRes.error || "No se pudo cargar el tour");
        return;
      }

      const detail = tourRes.data as TourDetail;
      const signed =
        imagesRes.success && imagesRes.data ? imagesRes.data : [];
      setTour(detail);
      setImages(buildDisplayImages(detail, signed));
    } catch (err) {
      if (isAxiosLikeError(err) && err.response?.data) {
        const d = err.response.data as ApiResponse;
        setError(d.error || d.message || "Error al cargar el tour");
      } else {
        setError(err instanceof Error ? err.message : "Error al cargar el tour");
      }
      setTour(null);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { tour, images, loading, error, refetch };
}
