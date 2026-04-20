import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withSecurity } from "@/lib/security-middleware";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: "admin" | "agent" | "customer";
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

// Tipo para contexto adicional en handlers (puede extenderse según necesidad)
export type RouteContext = Record<string, unknown> | { params: Record<string, string> };

export async function authenticateRequest(
  request: NextRequest,
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Token de autorización requerido" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Verificar el token con Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 },
      );
    }

    // Verificar que el usuario existe en la base de datos PostgreSQL
    const { prisma } = await import("@/lib/prisma");
    const appUser = await prisma.app_user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!appUser) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado en la base de datos" },
        { status: 401 },
      );
    }

    return {
      user: {
        id: appUser.id,
        email: appUser.email || "",
        username: appUser.username,
        role: appUser.role,
      },
    };
  } catch (error) {
    console.error("Error de autenticación:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// Función helper para crear manejadores de API autenticados con seguridad
export function withAuth(
  handler: (
    request: AuthenticatedRequest,
    user: AuthenticatedUser,
    context?: RouteContext,
  ) => Promise<NextResponse>,
) {
  return withSecurity({
    requireAuth: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 1000, // 1000 en ventana para suites de tests (TestSprite)
    },
    sanitizeInput: true,
  })(async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const context = args[0] as RouteContext | undefined;
    const authResult = await authenticateRequest(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = authResult.user;

    return handler(authenticatedRequest, authResult.user, context);
  });
}

// Función para verificar roles específicos con seguridad mejorada
export function withRole(requiredRole: "admin" | "agent" | "customer") {
  return function (
    handler: (
      request: AuthenticatedRequest,
      user: AuthenticatedUser,
      context?: RouteContext,
    ) => Promise<NextResponse>,
  ) {
    return withAuth(
      async (
        request: AuthenticatedRequest,
        user: AuthenticatedUser,
        context?: RouteContext,
      ) => {
        if (user.role !== requiredRole && user.role !== "admin") {
          return NextResponse.json(
            {
              success: false,
              error: "No tienes permisos para realizar esta acción",
            },
            { status: 403 },
          );
        }

        return handler(request, user, context);
      },
    );
  };
}

// Función específica para operaciones de administrador
export function withAdminAuth(
  handler: (
    request: AuthenticatedRequest,
    user: AuthenticatedUser,
    context?: RouteContext,
  ) => Promise<NextResponse>,
) {
  return withSecurity({
    requireAuth: true,
    allowedRoles: ["admin"],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 1000, // 1000 en ventana para suites de tests (TestSprite)
    },
    sanitizeInput: true,
  })(async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const context = args[0] as RouteContext | undefined;
    const authResult = await authenticateRequest(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Verificar que sea admin
    if (authResult.user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden realizar esta acción",
        },
        { status: 403 },
      );
    }

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = authResult.user;

    return handler(authenticatedRequest, authResult.user, context);
  });
}
