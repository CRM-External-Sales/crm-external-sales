import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { serializeForJSON } from "@/lib/utils";

// GET /api/suppliers/:corporate - Obtener un proveedor específico por cédula jurídica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ corporate: string }> | { corporate: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const corporate = parseInt(resolvedParams.corporate);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Verificar permisos - Solo ADMIN y AGENT
      if (user.role !== "admin" && user.role !== "agent") {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permisos para ver proveedores",
          },
          { status: 403 },
        );
      }

      // Verificar que el corporate sea válido
      if (isNaN(corporate)) {
        return NextResponse.json(
          {
            success: false,
            error: "Cédula jurídica inválida",
          },
          { status: 400 },
        );
      }

      // Obtener el supplier con sus detalles
      const supplier = await prisma.supplier.findUnique({
        where: { corporate: BigInt(corporate) },
        select: {
          corporate: true,
          company: true,
          phone: true,
          email: true,
          service: true,
          created_at: true,
          _count: {
            select: {
              tour: true,
              transfer: true,
            },
          },
        },
      });

      if (!supplier) {
        return NextResponse.json(
          {
            success: false,
            error: "Proveedor no encontrado",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeForJSON(supplier),
      });
    } catch (error) {
      console.error("Error obteniendo supplier:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

