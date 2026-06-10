import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  CreateTransferSchema,
  TransferQuerySchema,
} from "@/app/schemas/transfer.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import type { Prisma } from "@/generated/prisma";
import {
  ensureInternalSupplierExists,
  INTERNAL_SUPPLIER_CORPORATE,
} from "@/lib/internal-supplier";

// Interface para where clause de transfer
type TransferWhereInput = Prisma.transferWhereInput;

// GET /api/transfers - Obtener todos los transfers disponibles
export const GET = withAuth(
  async (request: AuthenticatedRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());

      const validatedQuery = TransferQuerySchema.parse(queryParams);
      const { page, limit, make, category, availability, type } = validatedQuery;

      // Construir cláusula where
      const where: TransferWhereInput = {};

      const makeTrim = make?.trim();
      if (makeTrim) {
        where.make = { contains: makeTrim, mode: "insensitive" };
      }

      const categoryTrim = category?.trim();
      if (categoryTrim) {
        where.category = { contains: categoryTrim, mode: "insensitive" };
      }

      if (availability) {
        where.availability = availability;
      }

      if (type?.trim()) {
        where.type = type;
      }

      // Calcular paginación
      const skip = (page - 1) * limit;

      // Obtener transfers
      const [transfers, total] = await Promise.all([
        prisma.transfer.findMany({
          where,
          skip,
          take: limit,
          select: {
            license_plate: true,
            availability: true,
            make: true,
            model: true,
            category: true,
            capacity: true,
            type: true,
            base_price: true,
            sale_price: true,
            supplier_corporate: true,
            supplier: {
              select: {
                corporate: true,
                company: true,
                email: true,
              },
            },
          },
          orderBy: {
            license_plate: "desc",
          },
        }),
        prisma.transfer.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: serializeForJSON(transfers),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error obteniendo transfers:", error);

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

// POST /api/transfers - Crear un nuevo transfer (solo admin o supplier)
export const POST = withAuth(async (request: AuthenticatedRequest, user) => {
  try {
    // Verificar que el usuario tenga permisos (admin o supplier)
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden crear transfers",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = CreateTransferSchema.parse(body);
    await ensureInternalSupplierExists(prisma);
    const supplierCorporate =
      validatedData.supplier_corporate ?? INTERNAL_SUPPLIER_CORPORATE;
    const salePrice =
      validatedData.type === "Interno"
        ? validatedData.base_price
        : (validatedData.sale_price ?? validatedData.base_price);

    // Verificar que el supplier existe
    const supplier = await prisma.supplier.findUnique({
      where: { corporate: supplierCorporate },
      select: {
        corporate: true,
        company: true,
        phone: true,
        email: true,
        service: true,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: "El proveedor especificado no existe",
        },
        { status: 404 },
      );
    }

    // Verificar si ya existe un transfer con esa placa
    const existingTransfer = await prisma.transfer.findUnique({
      where: { license_plate: validatedData.license_plate },
    });

    if (existingTransfer) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un transfer con esa placa",
        },
        { status: 409 },
      );
    }

    // Crear el transfer
    const transfer = await prisma.transfer.create({
      data: {
        license_plate: validatedData.license_plate,
        availability: validatedData.availability,
        make: validatedData.make,
        model: validatedData.model,
        category: validatedData.category,
        capacity: validatedData.capacity,
        type: validatedData.type,
        base_price: validatedData.base_price,
        sale_price: salePrice,
        supplier_corporate: supplierCorporate,
      },
      include: {
        supplier: {
          select: {
            corporate: true,
            company: true,
            email: true,
          },
        },
      },
    });

    // Log de auditoría
    console.log(`Transfer creado por admin ${user.username}:`, {
      licensePlate: transfer.license_plate,
      make: transfer.make,
      model: transfer.model,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transfer creado exitosamente",
        data: serializeForJSON(transfer),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creando transfer:", error);

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
