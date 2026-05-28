import { toast } from "sonner";

/** Abre WhatsApp Web/app con un mensaje prellenado */
export function openWhatsApp(message: string): void {
  if (typeof window === "undefined") return;

  if (!window.navigator.onLine) {
    toast.error("No se pudo enviar la solicitud. Inténtalo nuevamente.");
    return;
  }

  const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!phoneNumber) {
    toast.error("WhatsApp no está configurado. Contacte al administrador.");
    return;
  }

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}
