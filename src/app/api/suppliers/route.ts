import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { CreateSupplierSchema, SupplierQuerySchema } from "@/app/schemas/supplier.schema";
import { serializeForJSON, logSuppliersAccess } from "@/lib/utils";
import { ZodError } from "zod";
import { createValidationErrorResponse } from "@/lib/error-formatter";

interface SupplierWhereInput {
  company?: { contains: string; mode: "insensitive" };
  service?: { contains: string; mode: "insensitive" };
}

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

// GET /api/suppliers - Obtener todos los proveedores 
export const GET = withAuth(
  async (request: AuthenticatedRequest, user) => {
    try {
      // Solo ADMIN y AGENT
      if (user.role !== "admin" && user.role !== "agent") {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permisos para ver proveedores",
          },
          { status: 403 },
        );
      }

      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());

      const validatedQuery = SupplierQuerySchema.parse(queryParams);
      const { page, limit, company, service } = validatedQuery;

      // Validar longitud mínima de filtros (mínimo 2 caracteres)
      if (company && company.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: "El filtro de nombre de empresa debe tener al menos 2 caracteres",
          },
          { status: 400 },
        );
      }

      if (service && service.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: "El filtro de servicio debe tener al menos 2 caracteres",
          },
          { status: 400 },
        );
      }

      //Registrar acceso (antes de la consulta) - Log asíncrono
      logSuppliersAccess(user, { company, service });
      const where: SupplierWhereInput = {};

      if (company) {
        where.company = { contains: company, mode: "insensitive" };
      }

      if (service) {
        where.service = { contains: service, mode: "insensitive" };
      }

      // Calcular paginación
      const skip = (page - 1) * limit;

      //Obtener suppliers con Prisma
      const [suppliers, total] = await Promise.all([
        prisma.supplier.findMany({
          where,
          skip,
          take: limit,
          select: {
            corporate: true,
            company: true,
            phone: true,
            email: true,
            service: true,
            created_at: true,
          },
          orderBy: {
            company: "asc", //Ordenar por company (nombre)
          },
        }),
        prisma.supplier.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: serializeForJSON(suppliers),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error obteniendo suppliers:", error);

      //Retornar 400 si hay error de validación
      if (error instanceof ZodError) {
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

