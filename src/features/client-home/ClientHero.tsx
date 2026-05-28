"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ClientLangSwitcher } from "@/components/i18n/ClientLangSwitcher";
import { Button } from "@/components/ui/button";
import { CLIENT_CATALOG_PATH } from "./constants";

export function ClientHero() {
  const { t } = useTranslation("client");

  return (
    <section
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-10"
      aria-labelledby="client-hero-heading"
    >
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

      <div className="pointer-events-auto absolute left-4 top-4 z-20 sm:left-8 sm:top-6">
        <ClientLangSwitcher variant="onDarkHero" />
      </div>

      <h1
        id="client-hero-heading"
        className="relative z-10 max-w-3xl text-center text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
      >
        {t("hero.title")}
      </h1>

      <div className="relative z-10 mt-10 shrink-0">
        <Button
          asChild
          className="rounded-xl bg-[#4A6741] px-8 py-6 text-base font-semibold text-white shadow-md hover:bg-[#3d5636]"
        >
          <Link href={CLIENT_CATALOG_PATH}>{t("hero.ctaExplore")}</Link>
        </Button>
      </div>
    </section>
  );
}
