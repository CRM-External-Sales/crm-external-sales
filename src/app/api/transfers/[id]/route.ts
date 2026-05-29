import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateTransferSchema } from "@/app/schemas/transfer.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { ensureInternalSupplierExists } from "@/lib/internal-supplier";
import { parseLicensePlateParam } from "@/lib/license-plate";
import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";

// GET /api/transfers/:id - Obtener un transfer por license_plate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const licensePlate = parseLicensePlateParam(resolvedParams.id);

  const handler = withAuth(async () => {
    try {
      if (!licensePlate) {
        return NextResponse.json(
          {
            success: false,
            error: "Placa de transfer inválida",
          },
          { status: 400 },
        );
      }

      const transfer = await prisma.transfer.findUnique({
        where: { license_plate: licensePlate },
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
      });

      if (!transfer) {
        return NextResponse.json(
          {
            success: false,
            error: "Transfer no encontrado",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeForJSON(transfer),
      });
    } catch (error) {
      console.error("Error obteniendo transfer:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

// PUT /api/transfers/:id - Actualizar un transfer existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const licensePlate = parseLicensePlateParam(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      if (!licensePlate) {
        return NextResponse.json(
          {
            success: false,
            error: "Placa de transfer inválida",
          },
          { status: 400 },
        );
      }

      if (user.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Solo los administradores pueden actualizar transfers",
          },
          { status: 403 },
        );
      }

      const existingTransfer = await prisma.transfer.findUnique({
        where: { license_plate: licensePlate },
      });

      if (!existingTransfer) {
        return NextResponse.json(
          {
            success: false,
            error: "Transfer no encontrado",
          },
          { status: 404 },
        );
      }

      const body = await authRequest.json();
      const validatedData = UpdateTransferSchema.parse(body);
      const effectiveType = validatedData.type ?? existingTransfer.type;
      const effectiveBasePrice =
        validatedData.base_price ?? Number(existingTransfer.base_price);
      const updatePayload = { ...validatedData };
      if (effectiveType === "Interno") {
        updatePayload.sale_price = effectiveBasePrice;
      }
      if (validatedData.supplier_corporate != null) {
        await ensureInternalSupplierExists(prisma);
      }

      if (validatedData.supplier_corporate) {
        const supplier = await prisma.supplier.findUnique({
          where: { corporate: validatedData.supplier_corporate },
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
      }

      const updatedTransfer = await prisma.transfer.update({
        where: { license_plate: licensePlate },
        data: updatePayload,
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

      console.log(`Transfer actualizado por admin ${user.username}:`, {
        licensePlate: updatedTransfer.license_plate,
        make: updatedTransfer.make,
        model: updatedTransfer.model,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Transfer actualizado exitosamente",
        data: serializeForJSON(updatedTransfer),
      });
    } catch (error) {
      console.error("Error actualizando transfer:", error);

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

  return handler(request);
}

// DELETE /api/transfers/:id - Eliminar un transfer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const licensePlate = parseLicensePlateParam(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      if (!licensePlate) {
        return NextResponse.json(
          {
            success: false,
            error: "Placa de transfer inválida",
          },
          { status: 400 },
        );
      }

      if (user.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Solo los administradores pueden eliminar transfers",
          },
          { status: 403 },
        );
      }

      const existingTransfer = await prisma.transfer.findUnique({
        where: { license_plate: licensePlate },
        include: {
          reservation: true,
        },
      });

      if (!existingTransfer) {
        return NextResponse.json(
          {
            success: false,
            error: "Transfer no encontrado",
          },
          { status: 404 },
        );
      }

      if (existingTransfer.reservation.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No se puede eliminar el transfer porque tiene reservas asociadas",
          },
          { status: 409 },
        );
      }

      await prisma.transfer.delete({
        where: { license_plate: licensePlate },
      });

      console.log(`Transfer eliminado por admin ${user.username}:`, {
        licensePlate: existingTransfer.license_plate,
        make: existingTransfer.make,
        model: existingTransfer.model,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Transfer eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando transfer:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}
