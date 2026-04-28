import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReservationDetailView } from "@/features/reservations/Detail";

export default function ReservaDetallePage() {
  return (
    <DashboardLayout>
      <ReservationDetailView />
    </DashboardLayout>
  );
}
