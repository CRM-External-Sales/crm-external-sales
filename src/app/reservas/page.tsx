import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReservationsListView } from "@/features/reservations/View";

export default function ReservasPage() {
  return (
    <DashboardLayout>
      <ReservationsListView />
    </DashboardLayout>
  );
}
