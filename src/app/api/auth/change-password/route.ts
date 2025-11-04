import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ChangePasswordSchema } from "@/app/schemas/user.schema";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { ZodError } from "zod";

// POST /api/auth/change-password - Cambiar contraseña
export const POST = withAuth(async (request: AuthenticatedRequest, user) => {
  try {
    const body = await request.json();
    const validatedData = ChangePasswordSchema.parse(body);

    // Cambiar contraseña en Supabase
    const { error } = await supabase.auth.updateUser({
      password: validatedData.newPassword,
    });

    if (error) {
      console.log(
        `Error cambiando contraseña para ${user.username}:`,
        error.message,
      );
      return NextResponse.json(
        { success: false, error: "Error al cambiar la contraseña" },
        { status: 400 },
      );
    }

    // Log de auditoría
    console.log(`Contraseña cambiada por usuario: ${user.username}`, {
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    console.error("Error cambiando contraseña:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(createValidationErrorResponse(error), {
        status: 400,
      });
    }

    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
});
