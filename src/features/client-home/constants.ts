/** Ancla de la sección de catálogo (p. ej. botón de ayuda / scroll). */
export const CATALOG_SECTION_ID = "catalogo-tours";

export const CLIENT_CATALOG_PATH = "/catalogo";

export function clientTourDetailPath(tourId: number | string) {
  return `/catalogo/tour/${tourId}`;
}
