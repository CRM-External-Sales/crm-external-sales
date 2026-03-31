import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { View } from "@/features/users/View";

export default function UsersPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-6 text-muted-foreground">Cargando...</div>}>
        <View />
      </Suspense>
    </DashboardLayout>
  );
}
