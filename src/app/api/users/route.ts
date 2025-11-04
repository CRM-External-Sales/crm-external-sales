import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  UpdateUserSchema,
  UserQuerySchema,
  CreateUserSchema,
} from "@/app/schemas/user.schema";
import { supabase } from "@/lib/supabase";
import {
  sanitizeEmail,
  sanitizeUsername,
  sanitizePhone,
} from "@/lib/input-sanitizer";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { Prisma } from "../../generated/prisma";
import { ZodError } from "zod";

// Tipo para where clause de app_user
interface AppUserWhereInput {
  role?: "admin" | "agent" | "customer";
  OR?: Array<{
    username?: { contains: string; mode?: "insensitive" };
    email?: { contains: string; mode?: "insensitive" };
  }>;
}

// GET /api/users - Obtener todos los usuarios (solo admin)
export const GET = withAdminAuth(
  async (request: AuthenticatedRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());

      const validatedQuery = UserQuerySchema.parse(queryParams);
      const { page, limit, role, search } = validatedQuery;

      // Construir cláusula where
      const where: AppUserWhereInput = {};

      if (role) {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      // Calcular paginación
      const skip = (page - 1) * limit;

      // Obtener usuarios
      const [users, total] = await Promise.all([
        prisma.app_user.findMany({
          where,
          skip,
          take: limit,
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
                state: true,
                total: true,
                created_at: true,
              },
              take: 5, // Últimas 5 reservas
              orderBy: {
                created_at: "desc",
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        }),
        prisma.app_user.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);

      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          {
            success: false,
            error: "Parámetros de consulta inválidos",
            details: error.message,
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  },
);

// POST /api/users - Crear nuevo usuario (solo admin)
export const POST = withAdminAuth(
  async (request: AuthenticatedRequest, user) => {
    try {
      const body = await request.json();
      const validatedData = CreateUserSchema.parse(body);

      // Sanitizar datos de entrada
      const sanitizedData = {
        ...validatedData,
        email: sanitizeEmail(validatedData.email),
        username: sanitizeUsername(validatedData.username),
        phone: validatedData.phone
          ? sanitizePhone(validatedData.phone)
          : undefined,
      };

      // Verificar si el usuario ya existe
      const existingUser = await prisma.app_user.findFirst({
        where: {
          OR: [
            { email: sanitizedData.email },
            { username: sanitizedData.username },
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error:
              existingUser.email === sanitizedData.email
                ? "El email ya está registrado"
                : "El nombre de usuario ya está en uso",
          },
          { status: 409 },
        );
      }

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          {
            success: false,
            error: "Error al crear la cuenta de autenticación",
          },
          { status: 400 },
        );
      }

      // Crear usuario en la base de datos
      const appUser = await prisma.app_user.create({
        data: {
          id: authData.user.id,
          username: sanitizedData.username,
          email: sanitizedData.email,
          phone: sanitizedData.phone,
          role: sanitizedData.role,
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
      console.log(`Usuario creado por admin ${user.username}:`, {
        newUser: appUser.username,
        role: appUser.role,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          message: "Usuario creado exitosamente",
          data: appUser,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Error creando usuario:", error);

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
  },
);
