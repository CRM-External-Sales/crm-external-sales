import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateTourImageSchema } from "@/app/schemas/tour-image.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

// PUT /api/tours/:id/images/:imageId - Actualizar imagen (solo admin)
export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; imageId: string }> | { id: string; imageId: string };
  },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);
  const imageId = parseInt(resolvedParams.imageId);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    // Verificar permisos (solo admin)
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden actualizar imágenes",
        },
        { status: 403 },
      );
    }

    try {
      // Verificar IDs válidos
      if (isNaN(tourId) || isNaN(imageId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour o imagen inválido",
          },
          { status: 400 },
        );
      }

      // Verificar que el tour existe
      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
        select: { id_tour: true },
      });

      if (!tour) {
        return NextResponse.json(
          {
            success: false,
            error: "Tour no encontrado",
          },
          { status: 404 },
        );
      }

      // Verificar que la imagen existe y pertenece al tour
      const existingImage = await prisma.tour_image.findFirst({
        where: {
          id: BigInt(imageId),
          tour_id: BigInt(tourId),
        },
      });

      if (!existingImage) {
        return NextResponse.json(
          {
            success: false,
            error: "Imagen no encontrada o no pertenece al tour",
          },
          { status: 404 },
        );
      }

      // Parsear y validar body
      const body = await authRequest.json();
      const validatedData = UpdateTourImageSchema.parse(body);

      // Si se marca como cover, desmarcar otras imágenes del tour
      if (validatedData.is_cover === true) {
        await prisma.tour_image.updateMany({
          where: {
            tour_id: BigInt(tourId),
            id: { not: BigInt(imageId) },
          },
          data: { is_cover: false },
        });
      }

      // Actualizar la imagen
      const updatedImage = await prisma.tour_image.update({
        where: { id: BigInt(imageId) },
        data: {
          alt: validatedData.alt ?? undefined,
          is_cover: validatedData.is_cover ?? undefined,
          sort_order: validatedData.sort_order ?? undefined,
          updated_at: new Date(),
        },
      });

      // Generar URL pública
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("tours")
        .getPublicUrl(updatedImage.path);

      // Log de auditoría
      console.log(`Imagen actualizada por admin ${user.username}:`, {
        tourId,
        imageId,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Imagen actualizada exitosamente",
        data: {
          id: Number(updatedImage.id),
          tour_id: Number(updatedImage.tour_id),
          path: updatedImage.path,
          publicUrl: publicUrlData.publicUrl,
          alt: updatedImage.alt,
          is_cover: updatedImage.is_cover,
          sort_order: updatedImage.sort_order,
          created_at: updatedImage.created_at,
          updated_at: updatedImage.updated_at,
        },
      });
    } catch (error) {
      console.error("Error actualizando imagen:", error);

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

// DELETE /api/tours/:id/images/:imageId - Eliminar imagen (solo admin)
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; imageId: string }> | { id: string; imageId: string };
  },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);
  const imageId = parseInt(resolvedParams.imageId);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    // Verificar permisos (solo admin)
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden eliminar imágenes",
        },
        { status: 403 },
      );
    }

    try {
      // Verificar IDs válidos
      if (isNaN(tourId) || isNaN(imageId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour o imagen inválido",
          },
          { status: 400 },
        );
      }

      // Verificar que el tour existe
      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
        select: { id_tour: true },
      });

      if (!tour) {
        return NextResponse.json(
          {
            success: false,
            error: "Tour no encontrado",
          },
          { status: 404 },
        );
      }

      // Verificar que la imagen existe y pertenece al tour
      const existingImage = await prisma.tour_image.findFirst({
        where: {
          id: BigInt(imageId),
          tour_id: BigInt(tourId),
        },
      });

      if (!existingImage) {
        return NextResponse.json(
          {
            success: false,
            error: "Imagen no encontrada o no pertenece al tour",
          },
          { status: 404 },
        );
      }

      // Eliminar archivo de Supabase Storage
      const { error: deleteError } = await supabaseAdmin.storage
        .from("tours")
        .remove([existingImage.path]);

      if (deleteError) {
        console.error("Error eliminando archivo de Supabase:", deleteError);
        // Continuar con la eliminación de la BD aunque falle el storage
      }

      // Eliminar registro de la base de datos (cascade se encarga automáticamente)
      await prisma.tour_image.delete({
        where: { id: BigInt(imageId) },
      });

      // Log de auditoría
      console.log(`Imagen eliminada por admin ${user.username}:`, {
        tourId,
        imageId,
        path: existingImage.path,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Imagen eliminada exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando imagen:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

