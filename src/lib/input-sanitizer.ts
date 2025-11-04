import DOMPurify from "isomorphic-dompurify";

// Tipo recursivo para sanitización
type Sanitizable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Sanitizable[]
  | { [key: string]: Sanitizable };

// Sanitizar entrada para prevenir XSS
export function sanitizeInput<T extends Sanitizable>(input: T): T {
  if (typeof input === "string") {
    // Escapar caracteres HTML y sanitizar
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    }) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item)) as T;
  }

  if (input && typeof input === "object") {
    const sanitized: Record<string, Sanitizable> = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitizar tanto la clave como el valor
      const sanitizedKey = sanitizeInput(key);
      const sanitizedValue = sanitizeInput(value as Sanitizable);
      sanitized[sanitizedKey] = sanitizedValue;
    }
    return sanitized as T;
  }

  return input;
}

// Validar y sanitizar email
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeInput(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    throw new Error("Formato de email inválido");
  }

  return sanitized.toLowerCase().trim();
}

// Validar y sanitizar username
export function sanitizeUsername(username: string): string {
  const sanitized = sanitizeInput(username);
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

  if (!usernameRegex.test(sanitized)) {
    throw new Error(
      "Username debe contener solo letras, números y guiones bajos (3-20 caracteres)",
    );
  }

  return sanitized;
}

// Validar y sanitizar teléfono
export function sanitizePhone(phone: string): string {
  const sanitized = sanitizeInput(phone);
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

  if (!phoneRegex.test(sanitized)) {
    throw new Error("Formato de teléfono inválido");
  }

  return sanitized;
}
