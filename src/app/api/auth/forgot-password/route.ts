import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { supabase } from "@/lib/supabase";
import { ForgotPasswordSchema } from "@/app/schemas/user.schema";

// POST /api/auth/forgot-password - Solicitar restablecimiento de contraseña
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ForgotPasswordSchema.parse(body);

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(
      validatedData.email,
      {
        redirectTo: `${appUrl}/auth/reset-password`,
      },
    );

    if (error) {
      console.error("Supabase Auth Error (forgot-password):", error);

      const rateLimited =
        error.status === 429 ||
        error.code === "over_email_send_rate_limit" ||
        /rate limit/i.test(error.message);

      if (rateLimited) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Se alcanzó el límite de envío de correos de Supabase. Espera unos minutos (o hasta 1 hora) e inténtalo de nuevo, o revisa el correo que ya se envió antes.",
          },
          { status: 429 },
        );
      }

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

    if (error instanceof ZodError) {
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
