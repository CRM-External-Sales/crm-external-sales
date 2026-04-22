"use client";

import { useAuth } from "@/hooks/useAuth";
import { ClientHomeHeroView } from "@/features/client-home/ClientHomeHeroView";
import { View } from "./View";

export function HomeRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 items-center justify-center">
        <div
          className="size-10 animate-pulse rounded-full bg-[#4A6741]/25"
          aria-hidden
        />
      </div>
    );
  }

  if (user?.role === "customer") {
    return <ClientHomeHeroView />;
  }

  return <View />;
}
