import { AuthRouteGuard } from "@/components/layout/AuthRouteGuard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthRouteGuard>{children}</AuthRouteGuard>;
}
