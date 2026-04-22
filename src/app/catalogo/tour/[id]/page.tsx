import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Ficha pública de tour (cliente). Contenido detallado pendiente; la ruta ya existe
 * para enlazar desde el catálogo.
 */
export default async function ClientTourDetailPage({ params }: Props) {
  await params;
  return (
    <DashboardLayout>
      <div className="min-h-[70vh] bg-[#D6D3CC] px-4 py-6 sm:px-6">
        <Button
          asChild
          variant="ghost"
          className="mb-2 gap-1.5 px-0 text-[#313833] hover:bg-transparent hover:text-[#1a1f1b]"
        >
          <Link href="/catalogo">
            <ArrowLeft className="size-4" aria-hidden />
            Volver al catálogo
          </Link>
        </Button>
      </div>
    </DashboardLayout>
  );
}
