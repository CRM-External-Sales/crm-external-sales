import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

// GET /api/tours/:id/images - Listar todas las imágenes de un tour
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

      // Verificar que el tour existe
      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
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

      // Obtener todas las imágenes del tour
      const images = await prisma.tour_image.findMany({
        where: { tour_id: BigInt(tourId) },
        orderBy: { sort_order: "asc" },
      });

      // Obtener URLs públicas de Supabase Storage
      const imagesWithUrls = await Promise.all(
        images.map(async (image) => {
          try {
            const { data } = await supabaseAdmin.storage
              .from("tours")
              .createSignedUrl(image.path, 3600); // URL válida por 1 hora

            return {
              ...serializeForJSON(image),
              publicUrl: data?.signedUrl || null,
            };
          } catch (error) {
            console.error(`Error obteniendo URL para imagen ${image.id}:`, error);
            return {
              ...serializeForJSON(image),
              publicUrl: null,
            };
          }
        }),
      );

      return NextResponse.json({
        success: true,
        data: imagesWithUrls,
      });
    } catch (error) {
      console.error("Error obteniendo imágenes:", error);

      return NextResponse.json(
        { success: false, error: "Error interno del servidor" },
        { status: 500 },
      );
    }
  });

  return handler(request);
}

// POST /api/tours/:id/images - Agregar imagen(es) a un tour (solo admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tourId = parseInt(resolvedParams.id);

  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    // Verificar permisos (solo admin)
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los administradores pueden agregar imágenes",
        },
        { status: 403 },
      );
    }

    const uploadedImages: string[] = [];

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

      // Verificar que el tour existe
      const tour = await prisma.tour.findUnique({
        where: { id_tour: BigInt(tourId) },
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

      // Parsear FormData
      const formData = await request.formData();

      // Obtener imágenes: intentar primero "images" (plural), luego "image" (singular)
      let imageFiles: File[] = [];
      
      // Intentar con "images" (plural) - para múltiples archivos
      const imagesField = formData.getAll("images");
      if (imagesField && imagesField.length > 0) {
        imageFiles = imagesField.filter((item): item is File => item instanceof File);
      }

      // Si no hay imágenes con "images", intentar con "image" (singular)
      if (imageFiles.length === 0) {
        const imageField = formData.getAll("image");
        if (imageField && imageField.length > 0) {
          imageFiles = imageField.filter((item): item is File => item instanceof File);
        }
      }

      // Si aún no hay archivos, verificar si hay algún campo de tipo File
      if (imageFiles.length === 0) {
        // Buscar cualquier campo que sea un archivo
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            imageFiles.push(value);
          }
        }
      }

      // Verificar que haya al menos una imagen
      if (imageFiles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Debe proporcionar al menos una imagen",
          },
          { status: 400 },
        );
      }

      // Obtener metadatos opcionales (arrays)
      const alts = formData.getAll("alts[]").map((alt) => String(alt));
      const sortOrders = formData.getAll("sort_orders[]").map((order) => parseInt(String(order)) || 0);
      const isCovers = formData.getAll("is_covers[]").map((cover) => String(cover).toLowerCase() === "true");

      // Procesar cada imagen
      const processedImages = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        
        // Validar tipo de archivo
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedTypes.includes(imageFile.type)) {
          return NextResponse.json(
            {
              success: false,
              error: `Tipo de archivo no permitido para imagen ${i + 1}. Solo se permiten: JPEG, PNG, WEBP`,
            },
            { status: 400 },
          );
        }

        // Validar tamaño (max 10MB por imagen)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (imageFile.size > maxSize) {
          return NextResponse.json(
            {
              success: false,
              error: `La imagen ${i + 1} excede el tamaño máximo de 10MB`,
            },
            { status: 400 },
          );
        }

        // Generar nombre único para el archivo
        const fileExt = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${randomUUID()}.${fileExt}`;
        const filePath = `${tourId}/${fileName}`;

        // Convertir File a Buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Subir a Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("tours")
          .upload(filePath, buffer, {
            contentType: imageFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`Error subiendo imagen ${i + 1}:`, uploadError);
          
          // Rollback: eliminar imágenes ya subidas
          for (const uploadedPath of uploadedImages) {
            await supabaseAdmin.storage.from("tours").remove([uploadedPath]);
          }

          return NextResponse.json(
            {
              success: false,
              error: `Error subiendo imagen ${i + 1}: ${uploadError.message}`,
            },
            { status: 500 },
          );
        }

        uploadedImages.push(filePath);

        // Obtener metadatos para esta imagen (usar índices si están disponibles)
        const alt = alts[i] || imageFile.name;
        const sortOrder = sortOrders[i] ?? i;
        const isCover = isCovers[i] ?? false;

        // Crear registro en la base de datos
        const tourImage = await prisma.tour_image.create({
          data: {
            tour_id: BigInt(tourId),
            path: filePath,
            alt,
            is_cover: isCover,
            sort_order: sortOrder,
          },
        });

        // Obtener URL pública
        const { data: urlData } = await supabaseAdmin.storage
          .from("tours")
          .createSignedUrl(filePath, 3600);

        processedImages.push({
          ...serializeForJSON(tourImage),
          publicUrl: urlData?.signedUrl || null,
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: `${processedImages.length} imagen(es) agregada(s) exitosamente`,
          data: processedImages,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Error agregando imágenes:", error);

      // Rollback: eliminar imágenes ya subidas
      for (const uploadedPath of uploadedImages) {
        try {
          await supabaseAdmin.storage.from("tours").remove([uploadedPath]);
        } catch (rollbackError) {
          console.error("Error en rollback:", rollbackError);
        }
      }

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

