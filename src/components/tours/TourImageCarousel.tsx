"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CarouselImage = {
  id: string;
  displayUrl: string;
  alt?: string;
};

type TourImageCarouselProps = {
  images: CarouselImage[];
  title: string;
  className?: string;
};

export function TourImageCarousel({
  images,
  title,
  className,
}: TourImageCarouselProps) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-border/60 bg-white text-sm text-muted-foreground",
          className,
        )}
      >
        Sin imágenes para este tour
      </div>
    );
  }

  const current = images[index] ?? images[0];
  const hasMultiple = images.length > 1;

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goNext = () => {
    setIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/60 bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.displayUrl}
          alt={current.alt || title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-border/60 bg-[#F2F1ED]/95 text-[#3C4A22] shadow-sm transition-colors hover:bg-white"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-border/60 bg-[#F2F1ED]/95 text-[#3C4A22] shadow-sm transition-colors hover:bg-white"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  i === index ? "bg-[#647a3a]" : "bg-neutral-300 hover:bg-neutral-400",
                )}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
