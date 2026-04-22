/**
 * Convierte `tour_image.path` de Prisma en URL usable en <img>.
 *
 * En la API se guarda:
 * - URL completa (`https://...supabase.../object/public/tour-images/...`) desde flujos antiguos, o
 * - Clave de objeto en el bucket `tours` (p. ej. `123/uuid.jpg`) desde POST /api/tours e imágenes.
 */
export function resolveTourImageUrl(path: string | null | undefined): string | null {
  if (path == null || typeof path !== "string") return null;
  const p = path.trim();
  if (!p) return null;

  if (/^https?:\/\//i.test(p)) {
    return p;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;

  if (p.startsWith("/storage/")) {
    return `${base}${p}`;
  }

  // Archivo suelto en bucket `tour-images` (legado)
  if (!p.includes("/") && /\.(jpe?g|png|webp|gif)$/i.test(p)) {
    return `${base}/storage/v1/object/public/tour-images/${encodeURIComponent(p)}`;
  }

  // Claves del bucket `tours`: `idTour/archivo.ext`
  if (!p.includes("/")) {
    return null;
  }

  const encoded = p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  return `${base}/storage/v1/object/public/tours/${encoded}`;
}
