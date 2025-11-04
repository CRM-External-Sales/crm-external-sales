// Rate limiting simple en memoria (para producción usar Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): Promise<boolean> {
  const now = Date.now();
  const key = identifier;

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Primera request o ventana expirada
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (current.count >= maxRequests) {
    // Límite excedido
    return false;
  }

  // Incrementar contador
  current.count++;
  rateLimitStore.set(key, current);

  return true;
}

// Limpiar entradas expiradas periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

// Función para limpiar rate limiting
export function clearRateLimit(identifier?: string): void {
  if (identifier) {
    rateLimitStore.delete(identifier);
  } else {
    rateLimitStore.clear();
  }
}

export function getRateLimitStats(): {
  total: number;
  entries: Array<{ key: string; count: number; resetTime: number }>;
} {
  const entries = Array.from(rateLimitStore.entries()).map(([key, value]) => ({
    key,
    count: value.count,
    resetTime: value.resetTime,
  }));

  return {
    total: rateLimitStore.size,
    entries,
  };
}
