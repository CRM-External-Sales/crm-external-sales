import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";

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


