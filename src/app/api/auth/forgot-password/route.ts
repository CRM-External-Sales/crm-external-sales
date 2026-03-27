import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ForgotPasswordSchema } from "@/app/schemas/user.schema";

// POST /api/auth/forgot-password - Solicitar restablecimiento de contraseña
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ForgotPasswordSchema.parse(body);

    // Enviar email de restablecimiento
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(
      validatedData.email,
      {
        redirectTo: `${appUrl}/auth/reset-password`,
      },
    );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Error al enviar el email de restablecimiento",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email de restablecimiento enviado",
    });
  } catch (error) {
    console.error("Error en forgot password:", error);

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
