import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/auth/logout - Cerrar sesión
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Token de autorización requerido" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Error al cerrar sesión" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    console.error("Error en logout:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// GET /api/auth/me - Obtener usuario actual
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Token de autorización requerido" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Verificar token con Supabase
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

    // Obtener datos del usuario desde la base de datos
    const { prisma } = await import("@/lib/prisma");
    const appUser = await prisma.app_user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!appUser) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: appUser,
    });
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
