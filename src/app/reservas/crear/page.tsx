import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreateReservationView } from "@/features/reservations/Create";

export default function CrearReservaPage() {
  return (
    <DashboardLayout>
      <CreateReservationView />
    </DashboardLayout>
  );
}
