import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import {
  CreateTourSchema,
  TourQuerySchema,
  CreateTourScheduleSchema,
} from "@/app/schemas/tour.schema";
import { createValidationErrorResponse } from "@/lib/error-formatter";
import { serializeForJSON, serializeTourForJSON } from "@/lib/utils";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

// Interface para where clause de tour
interface TourWhereInput {
  type?: string;
  name?: { contains: string; mode?: "insensitive" };
  availability?: string;
}

// GET /api/tours - Obtener todos los tours disponibles
export const GET = withAuth(
  async (request: AuthenticatedRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());

      const validatedQuery = TourQuerySchema.parse(queryParams);
      const { page, limit, type, name, availability } = validatedQuery;

      // Construir cláusula where
      const where: TourWhereInput = {};

      if (type) {
        where.type = type;
      }

      if (name) {
        where.name = { contains: name, mode: "insensitive" };
      }

      if (availability) {
        where.availability = availability;
      }

      // Calcular paginación
      const skip = (page - 1) * limit;

      // Obtener tours
      const [tours, total] = await Promise.all([
        prisma.tour.findMany({
          where,
          skip,
          take: limit,
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
          orderBy: {
            id_tour: "desc",
          },
        }),
        prisma.tour.count({ where }),
      ]);

    return NextResponse.json({
      success: true,
      data: serializeTourForJSON(tours),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    } catch (error) {
      console.error("Error obteniendo tours:", error);

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

// POST /api/tours - Crear un nuevo tour con imágenes (solo admin)
export const POST = withAuth(async (request: AuthenticatedRequest, user) => {
  // Verificar permisos
  if (user.role !== "admin") {
    return NextResponse.json(
      {
        success: false,
        error: "Solo los administradores pueden crear tours",
      },
      { status: 403 },
    );
  }

  let tourId: bigint | null = null;
  const uploadedImages: string[] = [];

  try {
    // Parsear FormData
    const formData = await request.formData();
    
    // 1. Extraer y validar datos del tour
    const tourDataJson = formData.get("tour");
    if (!tourDataJson || typeof tourDataJson !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Campo 'tour' requerido y debe ser un JSON válido",
        },
        { status: 400 },
      );
    }

    let tourData;
    try {
      tourData = JSON.parse(tourDataJson);
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "El campo 'tour' contiene JSON inválido",
        },
        { status: 400 },
      );
    }

    const validatedData = CreateTourSchema.parse(tourData);

    // 2. Validar supplier
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

    // 3. Validar nombre único
    const existingTour = await prisma.tour.findUnique({
      where: { name: validatedData.name },
    });

    if (existingTour) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un tour con ese nombre",
        },
        { status: 409 },
      );
    }

    // 4. Extraer y validar schedules (si existen)
    const schedulesJson = formData.get("schedules");
    let schedules: any[] = [];
    
    if (schedulesJson && typeof schedulesJson === "string") {
      try {
        const parsedSchedules = JSON.parse(schedulesJson);
        if (Array.isArray(parsedSchedules)) {
          schedules = parsedSchedules.map((schedule) =>
            CreateTourScheduleSchema.parse(schedule)
          );
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "El campo 'schedules' debe ser un array JSON",
            },
            { status: 400 },
          );
        }
      } catch (parseError) {
        return NextResponse.json(
          {
            success: false,
            error: "El campo 'schedules' contiene JSON inválido",
          },
          { status: 400 },
        );
      }
    }

    // 5. Crear el tour en la base de datos (sin day y time)
    const tour = await prisma.tour.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        availability: validatedData.availability,
        base_price: validatedData.base_price,
        spots: validatedData.spots,
        requirements: validatedData.requirements,
        duration: validatedData.duration,
        difficulty: validatedData.difficulty,
        supplier_corporate: validatedData.supplier_corporate,
      },
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
      },
    });

    tourId = tour.id_tour;

    // 6. Crear los schedules del tour
    const processedSchedules: any[] = [];
    
    if (schedules.length > 0) {
      for (const scheduleData of schedules) {
        // Convertir la hora de HH:mm a Date usando UTC para evitar problemas de zona horaria
        const [hours, minutes] = scheduleData.start_time.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setUTCFullYear(1970, 0, 1);
        timeDate.setUTCHours(hours, minutes, 0, 0);

        const schedule = await prisma.tour_schedule.create({
          data: {
            tour_id: tourId,
            weekday: scheduleData.weekday,
            start_time: timeDate,
          },
        });

        processedSchedules.push({
          id: typeof schedule.id === "bigint" ? Number(schedule.id) : schedule.id,
          weekday: schedule.weekday,
          start_time: scheduleData.start_time, // Mantener el formato original
        });
      }
    }

    // 7. Procesar imágenes
    const imageFiles = formData.getAll("images");
    const alts = formData.getAll("alts[]").map((alt) => String(alt));
    const sortOrders = formData.getAll("sort_orders[]").map((so) => parseInt(String(so)));
    const isCovers = formData.getAll("is_covers[]").map((ic) => String(ic) === "true");

    const bucketName = "tours";
    const processedImages: any[] = [];

    if (imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        if (!(file instanceof File)) {
          continue;
        }

        // Validar tipo de archivo
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Tipo de archivo no permitido: ${file.type}. Solo se permiten JPEG, PNG y WEBP`);
        }

        // Generar nombre único
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uuid = randomUUID();
        const fileName = `${tourId}/${uuid}.${ext}`;
        const path = fileName;

        // Convertir a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Subir a Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Error subiendo imagen ${i + 1}: ${uploadError.message}`);
        }

        uploadedImages.push(path);

        // Obtener URL pública
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from(bucketName).getPublicUrl(path);

        // Guardar metadata en la base de datos
        const alt = alts[i] || null;
        const sortOrder = !isNaN(sortOrders[i]) ? sortOrders[i] : i;
        const isCover = isCovers[i] || false;

        // Si se marca como cover, desmarcar otras
        if (isCover) {
          await prisma.tour_image.updateMany({
            where: { tour_id: tourId },
            data: { is_cover: false },
          });
        }

        const tourImage = await prisma.tour_image.create({
          data: {
            tour_id: tourId,
            path,
            alt,
            is_cover: isCover,
            sort_order: sortOrder,
          },
        });

        processedImages.push({
          path: tourImage.path,
          alt: tourImage.alt,
          sort_order: tourImage.sort_order,
          is_cover: tourImage.is_cover,
          url: publicUrl,
        });
      }
    }

    // Log de auditoría
    console.log(`Tour creado por admin ${user.username}:`, {
      tourId: tour.id_tour,
      tourName: tour.name,
      imagesCount: processedImages.length,
      timestamp: new Date().toISOString(),
    });

    // Obtener el tour completo con relaciones para la respuesta
    const tourWithRelations = await prisma.tour.findUnique({
      where: { id_tour: tourId },
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

    return NextResponse.json(
      {
        success: true,
        message: "Tour creado exitosamente",
        data: {
          tour: serializeTourForJSON(tourWithRelations),
          schedules: serializeTourForJSON(processedSchedules),
          images: serializeTourForJSON(processedImages),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creando tour:", error);

    // Rollback: eliminar tour si existe (esto también eliminará schedules e imágenes por cascade)
    if (tourId) {
      try {
        await prisma.tour.delete({
          where: { id_tour: tourId },
        });
        console.log(`Tour ${tourId} eliminado debido a error`);
      } catch (deleteError) {
        console.error("Error eliminando tour:", deleteError);
      }
    }

    // Rollback: eliminar imágenes subidas
    for (const imagePath of uploadedImages) {
      try {
        await supabaseAdmin.storage.from("tours").remove([imagePath]);
        console.log(`Imagen ${imagePath} eliminada`);
      } catch (deleteError) {
        console.error("Error eliminando imagen:", deleteError);
      }
    }

    // Respuesta de error
    if (error instanceof ZodError) {
      return NextResponse.json(createValidationErrorResponse(error), {
        status: 400,
      });
    }

    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: errorMessage.includes("requerido") || errorMessage.includes("inválido") ? 400 : 500 },
    );
  }
});
