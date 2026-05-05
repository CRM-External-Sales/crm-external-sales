/**
 * Paleta del prototipo — solo tokens visuales para el módulo de reportes.
 */
export const REPORT = {
  primary: "#607536",
  primaryHover: "#4F612E",
  primaryActive: "#3E4C23",
  greenDark: "#2B3418",
  greenMid: "#3E4C23",
  teal: ["#3B7F73", "#2F665C", "#244F48", "#183733"] as const,
  bgSoft: "#E4E9D8",
  borderSoft: "#C3CEAB",
  /** Texto secundario / etiquetas */
  textLabel: "#5a6353",
} as const;

export function tealAt(index: number): string {
  return REPORT.teal[index % REPORT.teal.length];
}
