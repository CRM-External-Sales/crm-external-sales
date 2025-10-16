import { NextRequest, NextResponse } from "next/server";
import { clearRateLimit, getRateLimitStats } from "@/lib/rate-limit";

// POST /api/dev/reset-rate-limit - Resetear rate limiting (solo para desarrollo)
export const POST = async (request: NextRequest) => {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        error: "Este endpoint solo está disponible en desarrollo",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { identifier } = body;

    // Obtener estadísticas antes del reset
    const statsBefore = getRateLimitStats();

    // Limpiar rate limiting
    if (identifier) {
      clearRateLimit(identifier);
    } else {
      clearRateLimit(); // Limpiar todo
    }

    // Obtener estadísticas después del reset
    const statsAfter = getRateLimitStats();

    return NextResponse.json({
      success: true,
      message: identifier
        ? `Rate limiting limpiado para: ${identifier}`
        : "Rate limiting limpiado completamente",
      data: {
        before: statsBefore,
        after: statsAfter,
      },
    });
  } catch (error) {
    console.error("Error reseteando rate limiting:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
};

// GET /api/dev/reset-rate-limit - Ver estadísticas del rate limiting
export const GET = async (request: NextRequest) => {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        error: "Este endpoint solo está disponible en desarrollo",
      },
      { status: 403 },
    );
  }

  try {
    const stats = getRateLimitStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas de rate limiting:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
};
