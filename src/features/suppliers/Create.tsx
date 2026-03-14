 "use client";

 import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supplierService, type ApiResponse, type Supplier } from "@/lib/api";

import { CheckCircle2 } from "lucide-react";

 interface SupplierFormState {
   corporate: string;
   company: string;
   phone: string;
   email: string;
   service: string;
 }

 const initialFormState: SupplierFormState = {
   corporate: "",
   company: "",
   phone: "",
   email: "",
   service: "",
 };

 export const CreateSupplierView = () => {
   const [form, setForm] = useState<SupplierFormState>(initialFormState);
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   const handleChange =
     (field: keyof SupplierFormState) =>
     (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
       setForm((prev) => ({
         ...prev,
         [field]: event.target.value,
       }));
     };

   const handleReset = () => {
     setForm(initialFormState);
     setError(null);
     setSuccess(null);
   };

   const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
     event.preventDefault();
     setError(null);
     setSuccess(null);

     const corporateNumber = parseInt(form.corporate, 10);
     if (!form.corporate || Number.isNaN(corporateNumber) || corporateNumber <= 0) {
       setError("La identificación debe ser un número positivo.");
       return;
     }

     if (!form.company || !form.email || !form.phone || !form.service) {
       setError("Todos los campos son obligatorios.");
       return;
     }

     setSubmitting(true);

     try {
       const response = await supplierService.createSupplier({
         corporate: corporateNumber,
         company: form.company.trim(),
         phone: form.phone.trim(),
         email: form.email.trim(),
         service: form.service.trim(),
       });

       if (response.success && response.data) {
         const created: Supplier = response.data;
         setSuccess(`Proveedor ${created.company} creado correctamente.`);
         setError(null);
         // Mantener el corporate para referencia y limpiar el resto
         setForm((prev) => ({
           ...initialFormState,
           corporate: prev.corporate,
         }));
       } else {
         setError(response.error || "No se pudo crear el proveedor.");
       }
     } catch (err) {
       if (err instanceof AxiosError && err.response?.data) {
         const data = err.response.data as ApiResponse;
         setError(
           data.error ||
             data.message ||
             "Ocurrió un error al crear el proveedor. Intenta nuevamente.",
         );
       } else {
         setError(
           err instanceof Error
             ? err.message
             : "Ocurrió un error al crear el proveedor. Intenta nuevamente.",
         );
       }
     } finally {
       setSubmitting(false);
     }
   };

  return (
    <div className="flex-1">
      <div className="flex items-start justify-center">
         <div className="w-full max-w-4xl rounded-xl bg-[#F2F1ED] p-8 shadow-lg">
           <h1 className="mb-8 text-center text-2xl font-semibold text-[#3C4A22]">
             Crear Proveedor
           </h1>

           {error && (
             <Alert variant="destructive" className="mb-4">
               <AlertDescription>{error}</AlertDescription>
             </Alert>
           )}

           {success && (
             <Alert variant="success" className="mb-4">
               <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
               <AlertDescription>{success}</AlertDescription>
             </Alert>
           )}

           <form onSubmit={handleSubmit} className="space-y-5">
             {/* Identificación */}
             <div className="space-y-2">
               <Label htmlFor="corporate" className="text-[#4A4A4A] font-semibold">Identificación</Label>
               <Input
                 id="corporate"
                 type="number"
                 min={1}
                 step={1}
                 placeholder="Ingrese la identificación del proveedor"
                 value={form.corporate}
                 onChange={handleChange("corporate")}
                 className="bg-white border border-gray-300 rounded-md [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
                 required
               />
             </div>

             {/* Nombre */}
             <div className="space-y-2">
               <Label htmlFor="company" className="text-[#4A4A4A] font-semibold">Nombre</Label>
               <Input
                 id="company"
                 type="text"
                 placeholder="Ingrese el nombre del proveedor"
                 value={form.company}
                 onChange={handleChange("company")}
                 required
               />
             </div>

             {/* Correo */}
             <div className="space-y-2">
               <Label htmlFor="email" className="text-[#4A4A4A] font-semibold">Correo</Label>
               <Input
                 id="email"
                 type="email"
                 placeholder="Ingrese el correo electrónico"
                 value={form.email}
                 onChange={handleChange("email")}
                 required
               />
             </div>

             {/* Teléfono */}
             <div className="space-y-2">
               <Label htmlFor="phone" className="text-[#4A4A4A] font-semibold">Teléfono</Label>
               <Input
                 id="phone"
                 type="tel"
                 placeholder="Ingrese el número de teléfono"
                 value={form.phone}
                 onChange={handleChange("phone")}
                 required
               />
             </div>

             {/* Servicio */}
             <div className="space-y-2">
               <Label htmlFor="service" className="text-[#4A4A4A] font-semibold">Servicio</Label>
               <select
                 id="service"
                 value={form.service}
                 onChange={handleChange("service")}
                 className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                   form.service === "" ? "text-muted-foreground" : "text-foreground"
                 }`}
                 required
               >
                 <option value="">Seleccionar tipo de servicio</option>
                 <option value="Tour">Tour</option>
                 <option value="Transfer">Transfer</option>
               </select>
             </div>

             {/* Acciones */}
             <div className="mt-6 flex justify-between gap-3">
               <Button
                 type="button"
                 variant="outline"
                 onClick={handleReset}
                 className="bg-transparent border-2 border-[#313833] text-[#313833] hover:bg-transparent hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                 disabled={submitting}
               >
                 Limpiar
               </Button>
               <Button
                 type="submit"
                 className="bg-[#647a3a] text-white hover:bg-[#4f622d] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#647a3a]"
                 disabled={submitting}
               >
                 {submitting ? "Agregando..." : "Agregar"}
               </Button>
             </div>
           </form>
         </div>
       </div>
     </div>
   );
 };


