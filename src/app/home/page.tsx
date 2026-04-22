import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HomeRouter } from "@/features/home/HomeRouter";

export default function HomePage() {
  return (
    <DashboardLayout>
      <HomeRouter />
    </DashboardLayout>
  );
}
