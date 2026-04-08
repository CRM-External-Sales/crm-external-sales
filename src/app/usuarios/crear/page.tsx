import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreateUserView } from "@/features/users/Create";

export default function CreateUserPage() {
  return (
    <DashboardLayout>
      <CreateUserView />
    </DashboardLayout>
  );
}
