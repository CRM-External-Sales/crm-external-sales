import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreateTourView } from "@/features/tours/Create";

export default function CreateTourPage() {
  return (
    <DashboardLayout>
      <CreateTourView />
    </DashboardLayout>
  );
}
