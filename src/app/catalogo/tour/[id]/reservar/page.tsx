import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientMarketingBackNav } from "@/features/client-home/ClientMarketingBackNav";
import { prisma } from "@/lib/prisma";
import { serializeTourForJSON } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ClientWhatsAppMessageScope } from "@/features/client-home/ClientWhatsAppMessageContext";
import { TourReservationForm } from "@/features/client-tour-detail/TourReservationForm";
import type { ClientTourDetail } from "@/features/client-tour-detail/TourDetailCard";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TourReservationPage({ params }: Props) {
  const { id } = await params;
  const tourId = parseInt(id, 10);
  if (isNaN(tourId)) {
    return notFound();
  }

  const rawTour = await prisma.tour.findUnique({
    where: { id_tour: tourId },
    select: {
      id_tour: true,
      name: true,
      description: true,
      type: true,
      base_price: true,
      spots: true,
      duration: true,
      difficulty: true,
      requirements: true,
      tour_schedule: {
        select: {
          id: true,
          weekday: true,
          start_time: true,
        },
      },
      tour_image: {
        take: 0, // We don't need images for the reservation form
        select: {
          id: true,
          path: true,
          alt: true,
        },
      },
    },
  });

  if (!rawTour) {
    return notFound();
  }

  // Format times and numbers
  const tourDetail = serializeTourForJSON({
    ...rawTour,
    base_price: Number(rawTour.base_price),
    spots: Number(rawTour.spots),
    tour_schedule: rawTour.tour_schedule.map((s) => ({
      ...s,
      start_time: s.start_time
        ? s.start_time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
        : null,
    })),
  }) as ClientTourDetail;

  return (
    <DashboardLayout>
      <div className="min-h-[70vh] bg-[#D6D3CC] px-4 py-6 sm:px-6">
        <ClientMarketingBackNav
          href={`/catalogo/tour/${tourId}`}
          navKey="navigation.backToTour"
        />

        <ClientWhatsAppMessageScope
          message={`¡Hola! Tengo una consulta general sobre el tour "${tourDetail.name}".`}
        >
          <TourReservationForm tour={tourDetail} />
        </ClientWhatsAppMessageScope>
      </div>
    </DashboardLayout>
  );
}
