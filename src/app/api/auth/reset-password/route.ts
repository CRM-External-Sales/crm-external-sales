import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ResetPasswordSchema } from "@/app/schemas/user.schema";

// POST /api/auth/reset-password - Restablecer contraseña
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ResetPasswordSchema.parse(body);

    // Restablecer contraseña usando el token
    const { error } = await supabase.auth.updateUser({
      password: validatedData.password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Error al restablecer la contraseña" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña restablecida exitosamente",
    });
  } catch (error) {
    console.error("Error en reset password:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
