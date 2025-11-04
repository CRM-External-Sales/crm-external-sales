import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

// POST /api/upload - Subir una imagen a Supabase Storage
export async function POST(request: NextRequest) {
  const handler = withAuth(async (authRequest: AuthenticatedRequest, user) => {
    try {
      // Verificar permisos (solo admin)
      if (user.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Solo los administradores pueden subir archivos",
          },
          { status: 403 },
        );
      }

      // Obtener el FormData
      const formData = await authRequest.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: "No se proporcionó ningún archivo",
          },
          { status: 400 },
        );
      }

      // Validar tipo de archivo
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: "Tipo de archivo no permitido. Solo se permiten JPEG, PNG y WEBP",
          },
          { status: 400 },
        );
      }

      // Validar tamaño (5MB máximo)
      const maxSize = 5 * 1024 * 1024; // 5MB en bytes
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error: "El archivo es demasiado grande. Tamaño máximo: 5MB",
          },
          { status: 400 },
        );
      }

      // Convertir el archivo a buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const extension = file.name.split(".").pop();
      const fileName = `tour_${timestamp}_${randomStr}.${extension}`;

      // Subir a Supabase Storage
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.storage
        .from("tour-images") // Bucket de Supabase Storage
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Error subiendo archivo:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Error al subir el archivo a Supabase",
            details: error.message,
          },
          { status: 500 },
        );
      }

      // Obtener la URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("tour-images").getPublicUrl(fileName);

      console.log(`Archivo subido por admin ${user.username}: ${fileName}`);

      return NextResponse.json(
        {
          success: true,
          message: "Archivo subido exitosamente",
          data: {
            path: publicUrl,
            fileName: fileName,
            size: file.size,
            type: file.type,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Error en upload:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Error interno del servidor",
        },
        { status: 500 },
      );
    }
  });

  return handler(request);
}
