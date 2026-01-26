import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import {
  withAuth,
  withAdminAuth,
  type AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { UpdateUserSchema } from "@/app/schemas/user.schema";
import {
  sanitizeEmail,
  sanitizeUsername,
  sanitizePhone,
} from "@/lib/input-sanitizer";

// GET /api/users/[username] - Obtener usuario específico por username
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> | { username: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const targetUsername = resolvedParams.username;
  
  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {

      // Verificar permisos: solo admin puede ver otros usuarios, o el usuario puede verse a sí mismo
      if (user.role !== "admin" && user.username !== targetUsername) {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permisos para acceder a esta información",
          },
          { status: 403 },
        );
      }

      const appUser = await prisma.app_user.findUnique({
        where: { username: targetUsername },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          created_at: true,
          updated_at: true,
          reservation: {
            select: {
              reservation_id: true,
              created_at: true,
              state: true,
              total: true,
              people: true,
              tour: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: {
              created_at: "desc",
            },
          },
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
  });
  
  return handler(request);
}

// PUT /api/users/[username] - Actualizar usuario por username
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> | { username: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const targetUsername = resolvedParams.username;
  
  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      const body = await authRequest.json();
      const validatedData = UpdateUserSchema.parse(body);

      // Sanitizar datos de entrada
      const sanitizedData = {
        ...validatedData,
        email: validatedData.email
          ? sanitizeEmail(validatedData.email)
          : undefined,
        username: validatedData.username
          ? sanitizeUsername(validatedData.username)
          : undefined,
        phone: validatedData.phone
          ? sanitizePhone(validatedData.phone)
          : undefined,
      };

      // Verificar permisos: solo admin puede actualizar otros usuarios, o el usuario puede actualizarse a sí mismo
      if (user.role !== "admin" && user.username !== targetUsername) {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permisos para actualizar este usuario",
          },
          { status: 403 },
        );
      }

      // Los usuarios no admin no pueden cambiar su rol
      if (user.role !== "admin" && sanitizedData.role) {
        delete sanitizedData.role;
      }

      // NINGÚN usuario puede cambiar el username (es inmutable)
      if (sanitizedData.username && sanitizedData.username !== targetUsername) {
        return NextResponse.json(
          {
            success: false,
            error:
              "El nombre de usuario no se puede cambiar. Es un identificador inmutable.",
          },
          { status: 403 },
        );
      }

      // Verificar si el email ya existe (si se está actualizando)
      if (sanitizedData.email) {
        const existingUser = await prisma.app_user.findFirst({
          where: {
            email: sanitizedData.email,
            username: { not: targetUsername },
          },
        });

        if (existingUser) {
          return NextResponse.json(
            { success: false, error: "El email ya está en uso" },
            { status: 409 },
          );
        }
      }

      const updatedUser = await prisma.app_user.update({
        where: { username: targetUsername },
        data: {
          ...sanitizedData,
          updated_at: new Date(),
        },
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
      console.log(`Usuario actualizado por ${user.username}:`, {
        targetUser: targetUsername,
        updatedFields: Object.keys(sanitizedData).filter(
          (key) => key !== "updated_at",
        ),
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Usuario actualizado exitosamente",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error actualizando usuario:", error);

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
  
  return handler(request);
}

// DELETE /api/users/[username] - Eliminar usuario por username (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> | { username: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const targetUsername = resolvedParams.username;
  
  const handler = withAdminAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {

      // Log de auditoría
      console.log(`Usuario eliminado por admin ${user.username}:`, {
        deletedUser: targetUsername,
        timestamp: new Date().toISOString(),
      });

      // No permitir que un admin se elimine a sí mismo
      if (user.username === targetUsername) {
        return NextResponse.json(
          { success: false, error: "No puedes eliminar tu propia cuenta" },
          { status: 400 },
        );
      }

      // Verificar si el usuario existe
      const existingUser = await prisma.app_user.findUnique({
        where: { username: targetUsername },
      });

      if (!existingUser) {
        return NextResponse.json(
          { success: false, error: "Usuario no encontrado" },
          { status: 404 },
        );
      }

      // Verificar si el usuario tiene reservas activas
      const activeReservations = await prisma.reservation.count({
        where: {
          employee_user: existingUser.id,
          state: { not: "cancelled" },
        },
      });

      if (activeReservations > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No se puede eliminar un usuario con reservas activas",
          },
          { status: 400 },
        );
      }

      // Eliminar usuario de la base de datos (mantener en Supabase Auth para auditorías)
      await prisma.app_user.delete({
        where: { username: targetUsername },
      });

      console.log(
        `Usuario ${targetUsername} eliminado de la aplicación (mantenido en Auth para auditorías)`,
      );

      return NextResponse.json({
        success: true,
        message:
          "Usuario eliminado de la aplicación (mantenido en sistema de autenticación para auditorías)",
      });
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });
  
  return handler(request);
}
