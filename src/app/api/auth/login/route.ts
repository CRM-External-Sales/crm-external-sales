import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { LoginSchema } from "@/app/schemas/user.schema";
import { withSecurity } from "@/lib/security-middleware";
import { sanitizeEmail } from "@/lib/input-sanitizer";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { ZodError } from "zod";

// POST /api/auth/login - Inicio de sesión con protección contra fuerza bruta
export const POST = withSecurity({
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: process.env.NODE_ENV === "production" ? 20 : 1000, // 1000 en desarrollo para suites de tests (TestSprite), 20 en producción
  },
  sanitizeInput: true,
})(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validatedData = LoginSchema.parse(body);

    // Sanitizar email
    const sanitizedEmail = sanitizeEmail(validatedData.email);

    // Autenticar con Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: validatedData.password,
      });

    if (authError || !authData.user) {
      // Log de intento de login fallido
      console.log(`Intento de login fallido para: ${sanitizedEmail}`);
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    // Obtener datos del usuario desde la base de datos
    const appUser = await prisma.app_user.findUnique({
      where: { id: authData.user.id },
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
      console.log(`Usuario no encontrado en BD: ${authData.user.id}`);
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado en la base de datos" },
        { status: 404 },
      );
    }

    // Log de login exitoso
    console.log(`Login exitoso para: ${appUser.username} (${appUser.role})`);

    // Actualizar último acceso
    await prisma.app_user.update({
      where: { id: authData.user.id },
      data: { updated_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        user: appUser,
        session: authData.session,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);

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
