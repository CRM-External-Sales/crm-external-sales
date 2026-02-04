import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreateSupplierView } from "@/features/suppliers/Create";

export default function CrearProveedorPage() {
  return (
    <DashboardLayout>
      <CreateSupplierView />
    </DashboardLayout>
  );
}

