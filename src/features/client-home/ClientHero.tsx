"use client";

import Image from "next/image";
import Link from "next/link";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HomeLocale } from "./copy";
import { copy } from "./copy";
import { CLIENT_CATALOG_PATH } from "./constants";

type ClientHeroProps = {
  locale: HomeLocale;
  onLocaleChange: (locale: HomeLocale) => void;
};

export function ClientHero({ locale, onLocaleChange }: ClientHeroProps) {
  const t = copy[locale];

  return (
    <section
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-10"
      aria-labelledby="client-hero-heading"
    >
      {/* Misma imagen y overlay que en login. z-index no negativos: si no, el fondo queda bajo <main> y solo se ve el gris. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-105 transform-gpu object-cover object-center blur-sm"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[#313833]/50"
        aria-hidden
      />

      <div className="absolute right-4 top-4 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 rounded-lg border-0 bg-[#3d4540] text-white shadow-sm hover:bg-[#2f3531] hover:text-white"
            >
              <Languages className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="text-sm font-medium">{t.language}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem onClick={() => onLocaleChange("es")}>
              {t.spanish}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLocaleChange("en")}>
              {t.english}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h1
        id="client-hero-heading"
        className="relative z-10 max-w-3xl text-center text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
      >
        {t.heroTitle}
      </h1>

      <div className="relative z-10 mt-10 shrink-0">
        <Button
          asChild
          className="rounded-xl bg-[#4A6741] px-8 py-6 text-base font-semibold text-white shadow-md hover:bg-[#3d5636]"
        >
          <Link href={CLIENT_CATALOG_PATH}>{t.exploreTours}</Link>
        </Button>
      </div>
    </section>
  );
}
