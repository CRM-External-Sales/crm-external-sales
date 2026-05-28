"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_CLASS =
  "mb-6 gap-1.5 px-0 text-[#313833] hover:bg-transparent hover:text-[#1a1f1b]";

type NavKey =
  | "navigation.backToCatalog"
  | "navigation.backToTour"
  | "navigation.backToHomeStart";

export function ClientMarketingBackNav({
  href,
  navKey,
  className,
}: {
  href: string;
  navKey: NavKey;
  className?: string;
}) {
  const { t } = useTranslation("client");

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(DEFAULT_CLASS, className)}
    >
      <Link href={href}>
        <ArrowLeft className="size-4" aria-hidden />
        {t(navKey)}
      </Link>
    </Button>
  );
}
