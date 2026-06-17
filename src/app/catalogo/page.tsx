import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientCatalogPageView } from "@/features/client-home/ClientCatalogPageView";
import type { CatalogTour } from "@/features/client-home/types";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTourImageUrl } from "@/lib/tour-image-url";
import { serializeTourForJSON } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SIGNED_IMAGE_TTL_SEC = 60 * 60 * 24 * 7;

async function enrichCatalogTourImages(tours: CatalogTour[]): Promise<void> {
  const promises = tours.flatMap((tour) =>
    tour.tour_image.map(async (img, i) => {
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
    })
  );

  await Promise.all(promises);
}

export default async function CatalogoPage() {
  const raw = await prisma.tour.findMany({
    orderBy: { id_tour: "desc" },
    select: {
      id_tour: true,
      name: true,
      type: true,
      duration: true,
      base_price: true,
      description: true,
      tour_image: {
        orderBy: [{ is_cover: "desc" }, { sort_order: "asc" }],
        select: {
          path: true,
          alt: true,
          is_cover: true,
        },
      },
    },
  });

  const initialTours = serializeTourForJSON(raw) as CatalogTour[];
  await enrichCatalogTourImages(initialTours);

  return (
    <DashboardLayout>
      <ClientCatalogPageView initialTours={initialTours} />
    </DashboardLayout>
  );
}
