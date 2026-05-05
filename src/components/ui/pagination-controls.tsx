"use client";

import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function PaginationControls({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  disabled = false,
}: Props) {
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / Math.max(1, limit)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = safeTotal === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = safeTotal === 0 ? 0 : Math.min(safePage * limit, safeTotal);
  const canGoPrevious = !disabled && safePage > 1;
  const canGoNext = !disabled && safePage < totalPages;

  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="w-full text-left text-sm text-muted-foreground">
        Mostrando {start}–{end} de {safeTotal} registros
      </div>
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
        <label
          className="whitespace-nowrap text-sm text-[#5a6353]"
          htmlFor="pagination-limit"
        >
          Por página
        </label>
        <select
          id="pagination-limit"
          title="Seleccionar registros por página"
          className="rounded-md border border-[#C3CEAB] bg-white px-2 py-1.5 text-sm text-[#2B3418] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={limit}
          disabled={disabled}
          onChange={(e) => onLimitChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canGoPrevious}
          className="border-[#C3CEAB] bg-white text-[#3E4C23] hover:bg-[#E4E9D8]"
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canGoNext}
          className="border-[#C3CEAB] bg-white text-[#3E4C23] hover:bg-[#E4E9D8]"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
