import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/input-sanitizer";

// Interfaz para configuración de seguridad
export interface SecurityConfig {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  requireAuth?: boolean;
  allowedRoles?: string[];
  sanitizeInput?: boolean;
}

// Middleware de seguridad principal
export function withSecurity(config: SecurityConfig = {}) {
  return function (
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  ) {
    return async (
      request: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> => {
      try {
        // 1. Rate Limiting
        if (config.rateLimit) {
          const clientIP = getClientIP(request);
          const isAllowed = await rateLimit(
            clientIP,
            config.rateLimit.windowMs,
            config.rateLimit.maxRequests,
          );

          if (!isAllowed) {
            return NextResponse.json(
              {
                success: false,
                error: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
              },
              {
                status: 429,
                headers: {
                  "Retry-After": Math.ceil(
                    config.rateLimit.windowMs / 1000,
                  ).toString(),
                },
              },
            );
          }
        }

        // 2. Sanitización de entrada
        if (
          config.sanitizeInput &&
          request.method !== "GET" &&
          request.method !== "DELETE"
        ) {
          try {
            const body = await request.json();
            const sanitizedBody = sanitizeInput(body);

            // Crear nueva request con body sanitizado
            const sanitizedRequest = new NextRequest(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(sanitizedBody),
            });

            return handler(sanitizedRequest, ...args);
          } catch (error) {
            // Si no hay body o no es JSON válido, continuar sin sanitización
            console.log(
              "⚠️ No se pudo parsear el body para sanitización:",
              error instanceof Error ? error.message : "Error desconocido",
            );
          }
        }

        // 3. Validación de headers de seguridad
        const securityHeaders = validateSecurityHeaders(request);
        if (!securityHeaders.valid) {
          return NextResponse.json(
            {
              success: false,
              error: "Headers de seguridad inválidos",
              details: securityHeaders.errors,
            },
            { status: 400 },
          );
        }

        return handler(request, ...args);
      } catch (error) {
        console.error("Error en middleware de seguridad:", error);
        return NextResponse.json(
          { success: false, error: "Error de seguridad" },
          { status: 500 },
        );
      }
    };
  };
}

// Obtener IP del cliente
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
}

// Validar headers de seguridad
function validateSecurityHeaders(request: NextRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verificar User-Agent
  const userAgent = request.headers.get("user-agent");
  if (!userAgent || userAgent.length < 10) {
    errors.push("User-Agent inválido");
  }

  // Verificar Content-Type para requests con body
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      errors.push("Content-Type debe ser application/json");
    }
  }

  // Verificar tamaño del body
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    // 1MB
    errors.push("Body demasiado grande");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Middleware específico para autenticación con roles
export function withAuthAndRole(requiredRole?: string) {
  return function (
    handler: (
      request: NextRequest,
      user: any,
      ...args: any[]
    ) => Promise<NextResponse>,
  ) {
    return withSecurity({
      requireAuth: true,
      allowedRoles: requiredRole ? [requiredRole] : undefined,
    })(async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
      try {
        // Verificar token de autorización
        const authHeader = request.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return NextResponse.json(
            { success: false, error: "Token de autorización requerido" },
            { status: 401 },
          );
        }

        const token = authHeader.substring(7);

        // Verificar token con Supabase
        const { supabase } = await import("@/lib/supabase");
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !authUser) {
          return NextResponse.json(
            { success: false, error: "Token inválido" },
            { status: 401 },
          );
        }

        // Obtener usuario de la base de datos
        const { prisma } = await import("@/lib/prisma");
        const appUser = await prisma.app_user.findUnique({
          where: { id: authUser.id },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        });

        if (!appUser) {
          return NextResponse.json(
            { success: false, error: "Usuario no encontrado" },
            { status: 401 },
          );
        }

        // Verificar rol si es requerido
        if (
          requiredRole &&
          appUser.role !== requiredRole &&
          appUser.role !== "admin"
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "No tienes permisos para realizar esta acción",
            },
            { status: 403 },
          );
        }

        return handler(request, appUser, ...args);
      } catch (error) {
        console.error("Error en autenticación:", error);
        return NextResponse.json(
          { success: false, error: "Error de autenticación" },
          { status: 500 },
        );
      }
    });
  };
}
