/** Narrow unknown catch values to axios-style { response } without relying on axios named exports (CJS/ESM typings mismatch). */
export function isAxiosLikeError(
  err: unknown,
): err is { response?: { status?: number; data?: unknown } } {
  return typeof err === "object" && err !== null && "response" in err;
}
