import { AuthRouteGuard } from "@/components/layout/AuthRouteGuard";
import { View as LoginView } from "@/features/auth/View";

export default function Home() {
  return (
    <AuthRouteGuard>
      <LoginView />
    </AuthRouteGuard>
  );
}
