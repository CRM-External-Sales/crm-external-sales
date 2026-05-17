/**
 * Formato de moneda en USD. Los valores numéricos del backend se muestran como dólares (sin conversión).
 */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Acepta número, string numérico o null; evita NaN en UI si el JSON viene mal formado. */
export function formatUsdAmount(
  value: unknown,
  fallback: string = "—",
): string {
  if (value == null) {
    return fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatUsd(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) {
      return formatUsd(n);
    }
  }
  return fallback;
}
