import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TourDetailView } from "@/features/tours/Detail";

export default function TourDetallePage() {
  return (
    <DashboardLayout>
      <TourDetailView />
    </DashboardLayout>
  );
}
