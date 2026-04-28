"use client";

import { useEffect, useRef, useState } from "react";
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
} from "@/lib/api";
import { INTERNAL_SUPPLIER_CORPORATE } from "@/lib/internal-supplier";

// ========================
// Zod Schema
// ========================
const tourFormSchema = z.object({
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

type TourFormValues = z.infer<typeof tourFormSchema>;

interface Schedule {
  weekday: string;
  start_time: string;
}

interface ImageFile {
  file: File;
  preview: string;
  alt: string;
  is_cover: boolean;
}

export const CreateTourView: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(tourFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      availability: "",
      base_price: "" as unknown as number,
      spots: "" as unknown as number,
      requirements: "",
      duration: "",
      difficulty: "",
      supplier_corporate: INTERNAL_SUPPLIER_CORPORATE as unknown as number,
    },
  });

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const [images, setImages] = useState<ImageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar proveedores con servicio "Tour"
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const response = await supplierService.getSuppliers({
          page: 1,
          limit: 100,
          service: "Tour",
        });
        if (response.success && response.data) {
          setSuppliers(response.data);
        }
      } catch (err) {
        console.error("Error cargando proveedores:", err);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    loadSuppliers();

    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const handleAddSchedule = () => {
    if (!scheduleDay || !scheduleTime) return;
    setSchedules([...schedules, { weekday: scheduleDay, start_time: scheduleTime }]);
    setScheduleDay("");
    setScheduleTime("");
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: ImageFile[] = Array.from(files).map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      alt: `img-${images.length + index + 1}`,
      is_cover: images.length === 0 && index === 0, // La primera es portada por defecto
    }));

    setImages([...images, ...newImages]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);

    // Si borramos la portada, asignar la nueva primera imagen como portada
    if (images[index].is_cover && newImages.length > 0) {
      newImages[0].is_cover = true;
    }

    setImages(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );

      const newImages: ImageFile[] = files.map((file, index) => ({
        file,
        preview: URL.createObjectURL(file),
        alt: `img-${images.length + index + 1}`,
        is_cover: images.length === 0 && index === 0,
      }));

      setImages([...images, ...newImages]);
    }
  };

  const handleReset = () => {
    reset();
    setSchedules([]);
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setGlobalError(null);
    setSuccess(null);
  };

  const onSubmit = async (data: TourFormValues) => {
    setGlobalError(null);
    setSuccess(null);

    // Validaciones manuales complejas que no cubre Zod (arrays)
    if (schedules.length === 0) {
      setGlobalError("Debe agregar al menos un horario para el tour.");
      return;
    }

    if (images.length === 0) {
      setGlobalError("Debe subir al menos una imagen para el tour.");
      return;
    }

    try {
      const imagesPayload = images.map((img, index) => ({
        file: img.file,
        alt: img.alt,
        is_cover: img.is_cover,
        sort_order: index,
      }));

      const response = await tourService.createTour(
        {
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
        },
        schedules,
        imagesPayload,
      );

      if (response.success && response.data) {
        const message = `Tour '${data.name}' creado correctamente.`;
        setSuccess(message);
        toast.success(message);
        handleReset();
      } else {
        setGlobalError(response.error || "No se pudo crear el tour.");
      }
    } catch (err: unknown) {
      const e = err as any;
      if (e?.response?.data) {
        const payload = e.response.data as ApiResponse;
        setGlobalError(
          payload.error ||
            payload.message ||
            "Ocurrió un error al crear el tour. Intenta nuevamente.",
        );
      } else {
        setGlobalError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al crear el tour. Intenta nuevamente.",
        );
      }
    }
  };

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
        <div className="w-full max-w-[1000px] rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
          <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
            Crear tour
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
              {/* Columna Izquierda */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-[#4A4A4A] font-semibold after:ml-1 after:text-red-500 after:content-['*']"
                  >
                    Nombre
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ingresa el nombre del tour"
                    {...register("name")}
                  />
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
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Ingresa la descripción del tour"
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
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Ingresa los requisitos del tour"
                    {...register("requirements")}
                  />
                  {errors.requirements && (
                    <p className="text-red-500 text-xs font-medium">
                      {errors.requirements.message}
                    </p>
                  )}
                </div>

                {/* Sección Horarios */}
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
                      <option value="Lunes">Lunes</option>
                      <option value="Martes">Martes</option>
                      <option value="Miércoles">Miércoles</option>
                      <option value="Jueves">Jueves</option>
                      <option value="Viernes">Viernes</option>
                      <option value="Sábado">Sábado</option>
                      <option value="Domingo">Domingo</option>
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
                      className="bg-[#647a3a] text-white hover:bg-[#4f622d]"
                      disabled={!scheduleDay || !scheduleTime}
                    >
                      Agregar
                    </Button>
                  </div>

                  {schedules.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {schedules.map((schedule, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-white border rounded-md p-2 px-3 text-sm"
                        >
                          <span className="font-medium text-[#4A4A4A]">
                            {schedule.weekday} - {schedule.start_time}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSchedule(index)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha */}
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
                      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("availability") ? "text-muted-foreground" : "text-foreground"}`}
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
                      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("difficulty") ? "text-muted-foreground" : "text-foreground"}`}
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
                      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("duration") ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      <option value="">Seleccionar duración en horas</option>
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
                      placeholder="Seleccionar espacios disponibles"
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
                      className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${!watch("type") ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      <option value="">Seleccionar tipo de tour</option>
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
                      placeholder="Precio base (dólares)"
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
                        ? "Cargando proveedores…"
                        : "Operación interna (sin proveedor externo)"}
                    </option>
                    {suppliers
                      .filter((s) => s.corporate !== INTERNAL_SUPPLIER_CORPORATE)
                      .map((supplier) => (
                        <option key={supplier.corporate} value={supplier.corporate}>
                          {supplier.company}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Si no aplica un proveedor externo, deje el valor por defecto; el
                    tour queda registrado como operación interna.
                  </p>
                  {errors.supplier_corporate && (
                    <p className="text-red-500 text-xs font-medium">
                      {errors.supplier_corporate.message}
                    </p>
                  )}
                </div>

                {/* Sección Imágenes */}
                <div className="space-y-3 pt-2">
                  <Label className="text-[#4A4A4A] font-semibold block text-center">
                    Imágenes
                  </Label>

                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition bg-transparent"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="text-gray-500 mb-2" size={24} />
                    <p className="text-sm tracking-tight text-gray-500 font-medium">
                      Arrastra y suelta o cliquea para subir
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

                  {images.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {images.map((img, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-transparent border rounded-md p-2 px-3"
                        >
                          <div className="flex items-center gap-3">
                            <FileImage size={18} className="text-gray-500" />
                            <div>
                              <span className="font-medium text-sm text-[#4A4A4A] block">
                                {img.file.name}
                              </span>
                              <span className="text-xs text-gray-500 block">
                                {(img.file.size / 1024).toFixed(2)} KB
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
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

            {/* Acciones */}
            <div className="mt-8 flex justify-between gap-3 font-medium">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="bg-transparent border border-gray-400 text-[#313833] hover:bg-gray-100 px-6 py-2 rounded-lg"
                disabled={isSubmitting}
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                className="bg-[#647a3a] text-white hover:bg-[#4f622d] px-8 py-2 rounded-lg font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
