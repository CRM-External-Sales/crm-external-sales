import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateUserSchema } from "@/app/schemas/user.schema";

// GET /api/user - Obtener perfil del usuario actual
export const GET = withAuth(async (request: AuthenticatedRequest, user) => {
  try {
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
        { success: false, error: "Perfil de usuario no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: appUser,
    });
  } catch (error) {
    console.error("Error obteniendo perfil de usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
});

// PUT /api/user - Actualizar perfil del usuario actual (datos limitados)
export const PUT = withAuth(async (request: AuthenticatedRequest, user) => {
  try {
    const body = await request.json();
    const validatedData = UpdateUserSchema.parse(body);

    // Restricciones: Solo permitir actualizar phone y email
    // Username es inmutable, role solo puede ser cambiado por admin
    if (validatedData.username) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El nombre de usuario no se puede cambiar. Es un identificador inmutable.",
        },
        { status: 403 },
      );
    }

    if (validatedData.role) {
      return NextResponse.json(
        {
          success: false,
          error: "No puedes cambiar tu rol. Contacta al administrador.",
        },
        { status: 403 },
      );
    }

    // Verificar si el email ya existe (si se está actualizando)
    if (validatedData.email) {
      const existingUser = await prisma.app_user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "El email ya está en uso" },
          { status: 409 },
        );
      }
    }

    // Solo actualizar campos permitidos
    const allowedUpdates = {
      phone: validatedData.phone,
      email: validatedData.email,
      updated_at: new Date(),
    };

    const updatedUser = await prisma.app_user.update({
      where: { id: user.id },
      data: allowedUpdates,
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

    // Log de auditoría
    console.log(`Perfil actualizado por usuario: ${user.username}`, {
      updatedFields: Object.keys(allowedUpdates).filter(
        (key) => key !== "updated_at",
      ),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error actualizando perfil:", error);

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
});

// DELETE /api/user - Eliminación de cuenta deshabilitada
export const DELETE = withAuth(async (request: AuthenticatedRequest, user) => {
  return NextResponse.json(
    {
      success: false,
      error:
        "No puedes eliminar tu propia cuenta. Contacta al administrador para esta acción.",
      code: "SELF_DELETE_DISABLED",
    },
    { status: 403 },
  );
});
