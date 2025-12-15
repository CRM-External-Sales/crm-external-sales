import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { CreateSupplierSchema } from "@/app/schemas/supplier.schema";
import { ZodError } from "zod";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeForJSON } from "@/lib/utils";

// POST /api/suppliers - Crear un nuevo supplier (solo admin)
export const POST = withAuth(async (request: AuthenticatedRequest, user) => {
  // Verificar permisos de administrador
  if (user.role !== "admin") {
    return NextResponse.json(
      {
        success: false,
        error: "Solo los administradores pueden crear suppliers",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    const validated = CreateSupplierSchema.parse(body);

    // Verificar duplicados por claves únicas
    const [existingByCorporate, existingByEmail, existingByPhone] =
      await Promise.all([
        prisma.supplier.findUnique({
          where: { corporate: validated.corporate },
          select: { corporate: true },
        }),
        prisma.supplier.findUnique({
          where: { email: validated.email },
          select: { email: true },
        }),
        prisma.supplier.findUnique({
          where: { phone: validated.phone },
          select: { phone: true },
        }),
      ]);

    if (existingByCorporate) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un supplier con ese corporate",
        },
        { status: 409 },
      );
    }

    if (existingByEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un supplier con ese email",
        },
        { status: 409 },
      );
    }

    if (existingByPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un supplier con ese teléfono",
        },
        { status: 409 },
      );
    }

    // Crear supplier
    const supplier = await prisma.supplier.create({
      data: {
        corporate: validated.corporate,
        company: validated.company,
        phone: validated.phone,
        email: validated.email,
        service: validated.service,
      },
      select: {
        corporate: true,
        company: true,
        phone: true,
        email: true,
        service: true,
        created_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeForJSON(supplier),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(createValidationErrorResponse(error), {
        status: 400,
      });
    }

    console.error("Error creando supplier:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
});


