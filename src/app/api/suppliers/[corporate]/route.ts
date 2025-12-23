import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateSupplierSchema } from "@/app/schemas/supplier.schema";
import { ZodError } from "zod";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeForJSON } from "@/lib/utils";

// DELETE /api/suppliers/:corporate - Eliminar supplier (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ corporate: string }> | { corporate: string } },
) {
  const resolvedParams =
    params instanceof Promise ? await params : (params as { corporate: string });
  const corporateParam = resolvedParams.corporate;
  const corporateNumber = parseInt(corporateParam, 10);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Validar parámetro
      if (isNaN(corporateNumber)) {
        return NextResponse.json(
          { success: false, error: "Corporate inválido" },
          { status: 400 },
        );
      }

      // Verificar permisos (solo admin)
      if (user.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Solo los administradores pueden eliminar suppliers",
          },
          { status: 403 },
        );
      }

      const corporate = BigInt(corporateNumber);

      // Verificar que el supplier existe
      const supplier = await prisma.supplier.findUnique({
        where: { corporate },
        select: {
          corporate: true,
          company: true,
          email: true,
        },
      });

      if (!supplier) {
        return NextResponse.json(
          { success: false, error: "Supplier no encontrado" },
          { status: 404 },
        );
      }

      // Verificar dependencias: tours y transfers asociados
      const [toursCount, transfersCount] = await Promise.all([
        prisma.tour.count({ where: { supplier_corporate: corporate } }),
        prisma.transfer.count({ where: { supplier_corporate: corporate } }),
      ]);

      if (toursCount > 0 || transfersCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No se puede eliminar el supplier porque tiene registros asociados",
            details: `Tours: ${toursCount}, Transfers: ${transfersCount}`,
          },
          { status: 409 },
        );
      }

      // Eliminar supplier
      await prisma.supplier.delete({
        where: { corporate },
      });

      // Log de auditoría
      console.log(`Supplier eliminado por admin ${user.username}:`, {
        corporate: supplier.corporate,
        company: supplier.company,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Supplier eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando supplier:", error);
      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

// PUT /api/suppliers/:corporate - Actualizar supplier (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ corporate: string }> | { corporate: string } },
) {
  const resolvedParams =
    params instanceof Promise ? await params : (params as { corporate: string });
  const corporateParam = resolvedParams.corporate;
  const corporateNumber = parseInt(corporateParam, 10);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Validar parámetro
      if (isNaN(corporateNumber)) {
        return NextResponse.json(
          { success: false, error: "Corporate inválido" },
          { status: 400 },
        );
      }

      // Verificar permisos (solo admin)
      if (user.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Solo los administradores pueden actualizar suppliers",
          },
          { status: 403 },
        );
      }

      const corporate = BigInt(corporateNumber);

      // Verificar que el supplier existe
      const existingSupplier = await prisma.supplier.findUnique({
        where: { corporate },
        select: {
          corporate: true,
          company: true,
          phone: true,
          email: true,
          service: true,
        },
      });

      if (!existingSupplier) {
        return NextResponse.json(
          { success: false, error: "Supplier no encontrado" },
          { status: 404 },
        );
      }

      const body = await authRequest.json();
      const validatedData = UpdateSupplierSchema.parse(body);

      // Verificar unicidad si se actualiza email o phone
      if (validatedData.email) {
        const conflictByEmail = await prisma.supplier.findUnique({
          where: { email: validatedData.email },
          select: { corporate: true },
        });
        if (conflictByEmail && conflictByEmail.corporate !== corporate) {
          return NextResponse.json(
            {
              success: false,
              error: "Ya existe un supplier con ese email",
            },
            { status: 409 },
          );
        }
      }

      if (validatedData.phone) {
        const conflictByPhone = await prisma.supplier.findUnique({
          where: { phone: validatedData.phone },
          select: { corporate: true },
        });
        if (conflictByPhone && conflictByPhone.corporate !== corporate) {
          return NextResponse.json(
            {
              success: false,
              error: "Ya existe un supplier con ese teléfono",
            },
            { status: 409 },
          );
        }
      }

      // Actualizar supplier (corporate es PK y no se actualiza)
      const updatedSupplier = await prisma.supplier.update({
        where: { corporate },
        data: validatedData,
        select: {
          corporate: true,
          company: true,
          phone: true,
          email: true,
          service: true,
          created_at: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Supplier actualizado exitosamente",
        data: serializeForJSON(updatedSupplier),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(createValidationErrorResponse(error), {
          status: 400,
        });
      }
      console.error("Error actualizando supplier:", error);
      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}


