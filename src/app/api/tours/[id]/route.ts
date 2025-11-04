import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { UpdateTourSchema } from "@/app/schemas/tour.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeForJSON, serializeTourForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/tours/:id - Obtener un tour por ID con sus imágenes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Verificar que el tour ID sea válido
      if (isNaN(tourId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour inválido",
          },
          { status: 400 },
        );
      }

      // Obtener el tour con sus imágenes, schedules y supplier
      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
        select: {
          id_tour: true,
          name: true,
          description: true,
          type: true,
          availability: true,
          base_price: true,
          spots: true,
          requirements: true,
          duration: true,
          difficulty: true,
          supplier_corporate: true,
          supplier: {
            select: {
              corporate: true,
              company: true,
              email: true,
            },
          },
          tour_image: {
            orderBy: { sort_order: "asc" },
          },
          tour_schedule: {
            orderBy: { weekday: "asc" },
          },
        },
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

      return NextResponse.json({
        success: true,
        data: serializeTourForJSON(tour),
      });
    } catch (error) {
      console.error("Error obteniendo tour:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

// PUT /api/tours/:id - Actualizar un tour existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Verificar que el tour ID sea válido
      if (isNaN(tourId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour inválido",
          },
          { status: 400 },
        );
      }

      // Verificar permisos (solo admin)
      if (user.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Solo los administradores pueden actualizar tours",
          },
          { status: 403 },
        );
      }

      // Verificar que el tour existe
      const existingTour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
      });

      if (!existingTour) {
        return NextResponse.json(
          {
            success: false,
            error: "Tour no encontrado",
          },
          { status: 404 },
        );
      }

      const body = await authRequest.json();
      const validatedData = UpdateTourSchema.parse(body);

      // Si se actualiza el supplier, verificar que existe
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

      // Si se actualiza el nombre, verificar que no exista otro tour con ese nombre
      if (validatedData.name && validatedData.name !== existingTour.name) {
        const tourWithSameName = await prisma.tour.findUnique({
          where: { name: validatedData.name },
        });

        if (tourWithSameName) {
          return NextResponse.json(
            {
              success: false,
              error: "Ya existe un tour con ese nombre",
            },
            { status: 409 },
          );
        }
      }

      // Preparar datos para actualización (sin day y time)
      const updateData: any = { ...validatedData };
      
      // Actualizar el tour
      const updatedTour = await prisma.tour.update({
        where: { id_tour: BigInt(tourId) },
        data: {
          ...updateData,
        },
        include: {
          supplier: {
            select: {
              corporate: true,
              company: true,
              email: true,
            },
          },
          tour_image: {
            orderBy: { sort_order: "asc" },
          },
          tour_schedule: {
            orderBy: { weekday: "asc" },
          },
        },
      });

      // Log de auditoría
      console.log(`Tour actualizado por admin ${user.username}:`, {
        tourId: updatedTour.id_tour,
        tourName: updatedTour.name,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Tour actualizado exitosamente",
        data: serializeTourForJSON(updatedTour),
      });
    } catch (error) {
      console.error("Error actualizando tour:", error);

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

// DELETE /api/tours/:id - Eliminar un tour
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Verificar que el tour ID sea válido
      if (isNaN(tourId)) {
        return NextResponse.json(
          {
            success: false,
            error: "ID de tour inválido",
          },
          { status: 400 },
        );
      }

      // Verificar permisos (solo admin)
      if (user.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Solo los administradores pueden eliminar tours",
          },
          { status: 403 },
        );
      }

      // Verificar que el tour existe y obtener sus imágenes
      const existingTour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
        include: {
          tour_image: {
            select: {
              id: true,
              path: true,
            },
          },
        },
      });

      if (!existingTour) {
        return NextResponse.json(
          {
            success: false,
            error: "Tour no encontrado",
          },
          { status: 404 },
        );
      }

      // Eliminar todas las imágenes del storage de Supabase antes de eliminar el tour
      const imagePaths = existingTour.tour_image.map((image) => image.path);
      
      if (imagePaths.length > 0) {
        const { error: deleteError } = await supabaseAdmin.storage
          .from("tours")
          .remove(imagePaths);

        if (deleteError) {
          console.error("Error eliminando imágenes del storage:", deleteError);
          // Continuar con la eliminación del tour aunque falle la eliminación de imágenes
          // (podrían ser archivos ya eliminados o problemas de permisos)
        } else {
          console.log(`Eliminadas ${imagePaths.length} imagen(es) del storage de Supabase`);
        }
      }

      // Eliminar el tour (cascade eliminará automáticamente las imágenes y schedules de la BD)
      await prisma.tour.delete({
        where: { id_tour: BigInt(tourId) },
      });

      // Log de auditoría
      console.log(`Tour eliminado por admin ${user.username}:`, {
        tourId: existingTour.id_tour,
        tourName: existingTour.name,
        imagesDeleted: imagePaths.length,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Tour eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando tour:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}
