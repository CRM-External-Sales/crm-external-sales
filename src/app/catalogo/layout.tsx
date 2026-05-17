import { ClientCatalogAccessGate } from "@/features/client-home/clientCatalogAccess";

export default function CatalogoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientCatalogAccessGate>{children}</ClientCatalogAccessGate>;
}
