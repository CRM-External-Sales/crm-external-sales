"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, FileImage, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  supplierService,
  tourService,
  type ApiResponse,
  type Supplier,
  type Tour,
  type TourImage,
  type TourSchedule,
} from "@/lib/api";
import { INTERNAL_SUPPLIER_CORPORATE } from "@/lib/internal-supplier";

// ========================
// Zod Schema
// ========================
const editTourFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  type: z.string().min(1, "Seleccione un tipo de tour"),
  availability: z.string().min(1, "Seleccione la disponibilidad"),
  base_price: z.coerce.number().positive("El precio base debe ser mayor a 0"),
  spots: z.coerce
    .number()
    .positive("Los espacios deben ser mayores a 0")
    .int("Debe ser un número entero"),
  requirements: z.string().min(1, "Los requisitos son obligatorios"),
  duration: z.string().min(1, "Seleccione la duración"),
  difficulty: z.string().min(1, "Seleccione la dificultad"),
  supplier_corporate: z.coerce
    .number()
    .int("Seleccione un proveedor")
    .positive("Seleccione un proveedor"),
});

type EditTourFormValues = z.infer<typeof editTourFormSchema>;

function tourToFormDefaults(t: Tour): EditTourFormValues {
  return {
    name: t.name || "",
    description: t.description || "",
    type: t.type || "",
    availability: t.availability || "",
    base_price: t.base_price as unknown as number,
    spots: t.spots as unknown as number,
    requirements: t.requirements || "",
    duration: t.duration || "",
    difficulty: t.difficulty || "",
    supplier_corporate: (() => {
      const n = Number(t.supplier_corporate);
      return Number.isFinite(n) && n > 0
        ? n
        : INTERNAL_SUPPLIER_CORPORATE;
    })(),
  };
}

interface EditTourProps {
  tour: Tour;
  onCancel: () => void;
  onSuccess: () => void;
}

// Imagen nueva pendiente de subir
interface PendingImage {
  file: File;
  preview: string;
  alt: string;
}

export const EditTourView: React.FC<EditTourProps> = ({
  tour,
  onCancel,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editTourFormSchema),
    defaultValues: tourToFormDefaults(tour),
  });

  /** Fila fresca de GET /tours/:id (misma fuente de verdad que al guardar). */
  const [detailTour, setDetailTour] = useState<Tour | null>(null);
  const activeTour = detailTour ?? tour;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // --- Horarios existentes ---
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);

  // --- Imágenes existentes ---
  const [existingImages, setExistingImages] = useState<
    (TourImage & { publicUrl?: string })[]
  >([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // --- Imágenes nuevas para subir ---
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void tourService.getTourById(tour.id_tour).then((res) => {
      if (cancelled || !res.success || !res.data) return;
      setDetailTour(res.data);
      reset(tourToFormDefaults(res.data));
    });
    return () => {
      cancelled = true;
    };
  }, [tour.id_tour, reset]);

  /**
   * El listado carga proveedores con `service: "Tour"`. Si el tour ya tenía otra
   * cédula (p. ej. "General"), no había <option> y el navegador mostraba "interno".
   * Aquí añadimos el proveedor actual a las opciones si faltara.
   */
  const suppliersForSelect = useMemo(() => {
    const ext = suppliers.filter(
      (s) => s.corporate !== INTERNAL_SUPPLIER_CORPORATE,
    );
    const current = Number(activeTour.supplier_corporate);
    if (current === INTERNAL_SUPPLIER_CORPORATE) {
      return ext;
    }
    if (ext.some((s) => Number(s.corporate) === current)) {
      return ext;
    }
    const label =
      activeTour.supplier?.company?.trim() ||
      `Proveedor asignado (cédula ${current})`;
    return [
      ...ext,
      {
        corporate: current,
        company: label,
        phone: "",
        email: activeTour.supplier?.email ?? "",
        service: "",
        created_at: "",
      } as Supplier,
    ];
  }, [suppliers, activeTour]);

  // ========================
  // Cargar datos iniciales
  // ========================
  useEffect(() => {
    const loadAll = async () => {
      try {
        // Proveedores (todos los de servicio Tour; el actual se inyecta arriba si hace falta)
        const suppRes = await supplierService.getSuppliers({
          page: 1,
          limit: 100,
          service: "Tour",
        });
        if (suppRes.success && suppRes.data) setSuppliers(suppRes.data);
      } catch (err) {
        console.error("Error cargando proveedores:", err);
      } finally {
        setLoadingSuppliers(false);
      }

      try {
        // Horarios existentes
        const schRes = await tourService.getTourSchedules(tour.id_tour);
        if (schRes.success && schRes.data) setSchedules(schRes.data);
      } catch (err) {
        console.error("Error cargando horarios:", err);
      } finally {
        setLoadingSchedules(false);
      }

      try {
        // Imágenes existentes
        const imgRes = await tourService.getTourImages(tour.id_tour);
        if (imgRes.success && imgRes.data) setExistingImages(imgRes.data as any);
      } catch (err) {
        console.error("Error cargando imágenes:", err);
      } finally {
        setLoadingImages(false);
      }
    };

    loadAll();

    return () => {
      pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  // ========================
  // Horarios
  // ========================
  const handleAddSchedule = async () => {
    if (!scheduleDay || !scheduleTime) return;
    setAddingSchedule(true);
    try {
      const res = await tourService.addTourSchedules(tour.id_tour, [
        { weekday: scheduleDay, start_time: scheduleTime },
      ]);
      if (res.success && res.data) {
        setSchedules((prev) => [...prev, ...res.data!]);
        setScheduleDay("");
        setScheduleTime("");
      } else {
        setGlobalError(res.error || "No se pudo agregar el horario.");
      }
    } catch {
      setGlobalError("Error al agregar el horario.");
    } finally {
      setAddingSchedule(false);
    }
  };

  const handleRemoveSchedule = async (scheduleId: string) => {
    setDeletingScheduleId(scheduleId);
    try {
      const res = await tourService.deleteTourSchedule(tour.id_tour, scheduleId);
      if (res.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      } else {
        setGlobalError(res.error || "No se pudo eliminar el horario.");
      }
    } catch {
      setGlobalError("Error al eliminar el horario.");
    } finally {
      setDeletingScheduleId(null);
    }
  };

  // Formato de hora para mostrar (la API devuelve ISO o HH:MM)
  const formatTime = (raw: string) => {
    if (!raw) return "";
    if (raw.includes("T")) {
      const d = new Date(raw);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    }
    return raw.slice(0, 5);
  };

  // ========================
  // Imágenes nuevas (pendientes)
  // ========================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPending: PendingImage[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      alt: file.name,
    }));
    setPendingImages((prev) => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    const newPending: PendingImage[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      alt: file.name,
    }));
    setPendingImages((prev) => [...prev, ...newPending]);
  };

  const handleRemovePending = (index: number) => {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      const res = await tourService.deleteTourImage(tour.id_tour, imageId);
      if (res.success) {
        setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      } else {
        setGlobalError(res.error || "No se pudo eliminar la imagen.");
      }
    } catch {
      setGlobalError("Error al eliminar la imagen.");
    } finally {
      setDeletingImageId(null);
    }
  };

  const uploadPendingImages = async () => {
    if (pendingImages.length === 0) return;
    setUploadingImages(true);
    try {
      for (let i = 0; i < pendingImages.length; i++) {
        const pending = pendingImages[i];
        const formData = new FormData();
        formData.append("images", pending.file);
        formData.append("alts[]", pending.alt);
        formData.append("sort_orders[]", String(existingImages.length + i));
        formData.append("is_covers[]", String(existingImages.length === 0 && i === 0));

        const { http } = await import("@/lib/axios");
        const uploadRes = await http.post(`/tours/${tour.id_tour}/images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const data = uploadRes.data as any;
        if (data.success && data.data) {
          setExistingImages((prev) => [
            ...prev,
            ...(Array.isArray(data.data) ? data.data : [data.data]),
          ]);
        }
      }
      setPendingImages([]);
    } catch {
      setGlobalError("Error al subir una o más imágenes.");
    } finally {
      setUploadingImages(false);
    }
  };

  // ========================
  // Submit principal
  // ========================
  const onSubmit = async (data: EditTourFormValues) => {
    setGlobalError(null);
    setSuccess(null);

    try {
      // 1. Actualizar datos base del tour
      const response = await tourService.updateTour(tour.id_tour, {
        name: data.name.trim(),
        description: data.description.trim(),
        type: data.type.trim(),
        availability: data.availability.trim(),
        base_price: data.base_price,
        spots: data.spots,
        requirements: data.requirements.trim(),
        duration: data.duration.trim(),
        difficulty: data.difficulty.trim(),
        supplier_corporate: data.supplier_corporate,
      });

      if (!response.success) {
        setGlobalError(response.error || "No se pudo actualizar el tour.");
        return;
      }

      // 2. Subir imágenes pendientes
      if (pendingImages.length > 0) {
        await uploadPendingImages();
      }

      setSuccess(`Tour '${data.name}' actualizado correctamente.`);
      toast.success(`Tour '${data.name}' actualizado correctamente.`);
      setTimeout(() => onSuccess(), 1500);
    } catch (err: unknown) {
      const e = err as any;
      if (e?.response?.data) {
        const payload = e.response.data as ApiResponse;
        setGlobalError(
          payload.error || payload.message || "Error al actualizar el tour.",
        );
      } else {
        setGlobalError(
          err instanceof Error ? err.message : "Error al actualizar el tour.",
        );
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
      <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
        Editar tour: {tour.name}
      </h1>

      {globalError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ── Columna Izquierda ── */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
              >
                Nombre
              </Label>
              <Input id="name" placeholder="Nombre del tour" {...register("name")} />
              {errors.name && (
                <p className="text-red-500 text-xs font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
              >
                Descripción
              </Label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Descripción del tour"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-red-500 text-xs font-medium">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="requirements"
                className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
              >
                Requisitos
              </Label>
              <textarea
                id="requirements"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Requisitos del tour"
                {...register("requirements")}
              />
              {errors.requirements && (
                <p className="text-red-500 text-xs font-medium">
                  {errors.requirements.message}
                </p>
              )}
            </div>

            {/* ── Horarios ── */}
            <div className="space-y-3 pt-2">
              <Label className="text-[#4A4A4A] font-semibold block text-center">
                Horarios
              </Label>
              <div className="flex gap-2 items-center">
                <select
                  className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!scheduleDay ? "text-muted-foreground" : ""}`}
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(e.target.value)}
                >
                  <option value="">Seleccionar día</option>
                  {[
                    "Lunes",
                    "Martes",
                    "Miércoles",
                    "Jueves",
                    "Viernes",
                    "Sábado",
                    "Domingo",
                  ].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full"
                />
                <Button
                  type="button"
                  onClick={handleAddSchedule}
                  className="bg-[#647a3a] text-white hover:bg-[#4f622d] whitespace-nowrap"
                  disabled={!scheduleDay || !scheduleTime || addingSchedule}
                >
                  {addingSchedule ? "..." : "Agregar"}
                </Button>
              </div>

              {loadingSchedules ? (
                <p className="text-sm text-muted-foreground">Cargando horarios...</p>
              ) : schedules.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center bg-white border rounded-md p-2 px-3 text-sm"
                    >
                      <span className="font-medium text-[#4A4A4A]">
                        {s.weekday} - {formatTime(s.start_time)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSchedule(s.id)}
                        disabled={deletingScheduleId === s.id}
                        className="text-red-500 hover:text-red-700 transition disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  No hay horarios registrados.
                </p>
              )}
            </div>
          </div>

          {/* ── Columna Derecha ── */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="availability"
                  className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                >
                  Disponibilidad
                </Label>
                <select
                  id="availability"
                  {...register("availability")}
                  className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("availability") ? "text-muted-foreground" : ""}`}
                >
                  <option value="">Seleccionar disponibilidad</option>
                  <option value="Disponible">Disponible</option>
                  <option value="No disponible">No disponible</option>
                </select>
                {errors.availability && (
                  <p className="text-red-500 text-xs font-medium">
                    {errors.availability.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="difficulty"
                  className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                >
                  Dificultad
                </Label>
                <select
                  id="difficulty"
                  {...register("difficulty")}
                  className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("difficulty") ? "text-muted-foreground" : ""}`}
                >
                  <option value="">Seleccionar dificultad</option>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
                {errors.difficulty && (
                  <p className="text-red-500 text-xs font-medium">
                    {errors.difficulty.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="duration"
                  className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                >
                  Duración
                </Label>
                <select
                  id="duration"
                  {...register("duration")}
                  className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("duration") ? "text-muted-foreground" : ""}`}
                >
                  <option value="">Seleccionar duración</option>
                  <option value="1 a 2 horas">1 a 2 horas</option>
                  <option value="3 a 4 horas">3 a 4 horas</option>
                  <option value="Medio día">Medio día</option>
                  <option value="Día completo">Día completo</option>
                  <option value="Múltiples días">Múltiples días</option>
                </select>
                {errors.duration && (
                  <p className="text-red-500 text-xs font-medium">
                    {errors.duration.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="spots"
                  className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                >
                  Espacios
                </Label>
                <Input
                  id="spots"
                  type="number"
                  min={1}
                  placeholder="Espacios"
                  {...register("spots")}
                />
                {errors.spots && (
                  <p className="text-red-500 text-xs font-medium">
                    {errors.spots.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="type"
                  className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                >
                  Tipo
                </Label>
                <select
                  id="type"
                  {...register("type")}
                  className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("type") ? "text-muted-foreground" : ""}`}
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="Aventura">Aventura</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Naturaleza">Naturaleza</option>
                  <option value="Relax">Relax</option>
                </select>
                {errors.type && (
                  <p className="text-red-500 text-xs font-medium">
                    {errors.type.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="base_price"
                  className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                >
                  Precio
                </Label>
                <Input
                  id="base_price"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Precio base ($)"
                  {...register("base_price")}
                />
                {errors.base_price && (
                  <p className="text-red-500 text-xs font-medium">
                    {errors.base_price.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="supplier_corporate"
                className="text-[#4A4A4A] font-semibold"
              >
                Proveedor
              </Label>
              <select
                id="supplier_corporate"
                {...register("supplier_corporate", { valueAsNumber: true })}
                disabled={loadingSuppliers}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={INTERNAL_SUPPLIER_CORPORATE}>
                  {loadingSuppliers
                    ? "Cargando…"
                    : "Operación interna (sin proveedor externo)"}
                </option>
                {suppliersForSelect.map((s) => (
                  <option key={s.corporate} value={s.corporate}>
                    {s.company}
                  </option>
                ))}
              </select>
              
              {errors.supplier_corporate && (
                <p className="text-red-500 text-xs font-medium">
                  {errors.supplier_corporate.message}
                </p>
              )}
            </div>

            {/* ── Imágenes ── */}
            <div className="space-y-3 pt-2">
              <Label className="text-[#4A4A4A] font-semibold block text-center">
                Imágenes
              </Label>

              {/* Imágenes existentes */}
              {loadingImages ? (
                <p className="text-sm text-muted-foreground">Cargando imágenes...</p>
              ) : (
                existingImages.length > 0 && (
                  <div className="space-y-2">
                    {existingImages.map((img) => (
                      <div
                        key={img.id}
                        className="flex justify-between items-center bg-white border rounded-md p-2 px-3"
                      >
                        <div className="flex items-center gap-3">
                          {(img as any).publicUrl ? (
                            <img
                              src={(img as any).publicUrl}
                              alt={img.alt || ""}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <FileImage size={20} className="text-gray-400" />
                          )}
                          <div>
                            <span className="text-sm font-medium text-[#4A4A4A] block">
                              {img.alt || img.path.split("/").pop()}
                            </span>
                            {img.is_cover && (
                              <span className="text-xs text-green-600 font-medium">
                                Portada
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingImage(img.id)}
                          disabled={deletingImageId === img.id}
                          className="text-red-500 hover:text-red-700 transition disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Drop zona para nuevas imágenes */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition bg-transparent"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="text-gray-400 mb-1" size={22} />
                <p className="text-sm text-gray-500 font-medium">
                  Arrastra o cliquea para agregar imágenes
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
              </div>

              {/* Imágenes pendientes de subir */}
              {pendingImages.length > 0 && (
                <div className="space-y-2">
                  {pendingImages.map((img, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-md p-2 px-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileImage size={18} className="text-amber-500" />
                        <div>
                          <span className="font-medium text-sm text-[#4A4A4A] block">
                            {img.file.name}
                          </span>
                          <span className="text-xs text-amber-600">
                            Pendiente de guardar
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePending(index)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="mt-8 flex justify-between gap-3 font-medium">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-transparent border border-gray-400 text-[#313833] hover:bg-gray-100 px-6 py-2 rounded-lg"
            disabled={isSubmitting || uploadingImages}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-[#647a3a] text-white hover:bg-[#4f622d] px-8 py-2 rounded-lg font-semibold"
            disabled={isSubmitting || uploadingImages}
          >
            {isSubmitting || uploadingImages ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
};
