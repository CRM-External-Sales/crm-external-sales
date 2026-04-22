export const metadata = {
  title: "Listar tours | CRM",
  description: "Ver la lista de tours del sistema",
};

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { View } from "@/features/tours/View";

export default function ListToursPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <View />
      </div>
    </DashboardLayout>
  );
}
