import { revalidatePath } from "next/cache";

/** Refresca las páginas del catálogo cliente tras cambios en tours. */
export function revalidateClientCatalog(tourId?: string | number | bigint): void {
  revalidatePath("/catalogo");

  if (tourId == null) return;

  const id = String(tourId);
  revalidatePath(`/catalogo/tour/${id}`);
  revalidatePath(`/catalogo/tour/${id}/reservar`);
}
