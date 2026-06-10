import { AuthRouteGuard } from "@/components/layout/AuthRouteGuard";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthRouteGuard>{children}</AuthRouteGuard>;
}
