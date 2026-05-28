import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientMarketingBackNav } from "@/features/client-home/ClientMarketingBackNav";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTourImageUrl } from "@/lib/tour-image-url";
import { serializeTourForJSON } from "@/lib/utils";
import { ClientWhatsAppMessageScope } from "@/features/client-home/ClientWhatsAppMessageContext";
import { TourDetailCard, type ClientTourDetail } from "@/features/client-tour-detail/TourDetailCard";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

const SIGNED_IMAGE_TTL_SEC = 60 * 60 * 24 * 7;

async function enrichTourImages(tour: ClientTourDetail): Promise<void> {
  if (!tour.tour_image) return;
  
  const promises = tour.tour_image.map(async (img, i) => {
    const raw = (img.path || "").trim();
    if (!raw || /^https?:\/\//i.test(raw)) return;
    if (!raw.includes("/")) return;

    const { data } = await supabaseAdmin.storage
      .from("tours")
      .createSignedUrl(raw, SIGNED_IMAGE_TTL_SEC);

    if (data?.signedUrl) {
      tour.tour_image[i] = { ...img, path: data.signedUrl };
    } else {
      const pub = resolveTourImageUrl(raw);
      if (pub) tour.tour_image[i] = { ...img, path: pub };
    }
  });

  await Promise.all(promises);
}

export default async function ClientTourDetailPage({ params }: Props) {
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
        orderBy: [{ is_cover: "desc" }, { sort_order: "asc" }],
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
      // Prisma start_time is a Date, format it to HH:mm (using UTC to prevent timezone shifts)
      start_time: s.start_time
        ? s.start_time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
        : null,
    })),
  }) as ClientTourDetail;

  await enrichTourImages(tourDetail);

  return (
    <DashboardLayout>
      <div className="min-h-[70vh] bg-[#D6D3CC] px-4 py-6 sm:px-6">
        <ClientMarketingBackNav href="/catalogo" navKey="navigation.backToCatalog" />

        <ClientWhatsAppMessageScope
          message={`¡Hola! Tengo una consulta sobre el tour "${tourDetail.name}".`}
        >
          <TourDetailCard tour={tourDetail} />
        </ClientWhatsAppMessageScope>
      </div>
    </DashboardLayout>
  );
}
