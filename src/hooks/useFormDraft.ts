"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  clearFormDraft,
  hasMeaningfulDraftDiff,
  loadFormDraft,
  omitFields,
  saveFormDraft,
} from "@/lib/form-draft-storage";

const SAVE_DEBOUNCE_MS = 500;

export type FormDraftExtraHandlers = {
  get: () => unknown;
  apply: (extra: unknown) => void;
};

export type UseFormDraftOptions<T extends FieldValues> = {
  /** Clave única, p. ej. `transfers/create` o `tours/edit:42` */
  draftKey: string;
  form: Pick<UseFormReturn<T>, "watch" | "reset" | "getValues">;
  defaultValues: T;
  /** Campos que no se guardan (contraseñas, etc.) */
  excludeFields?: string[];
  /** Estado adicional serializable (horarios de tour, etc.) */
  extra?: FormDraftExtraHandlers;
  /** Esperar carga async antes de restaurar (formularios de edición) */
  isReady?: boolean;
  /** Desactivar borrador en este formulario */
  enabled?: boolean;
  /** Mensaje al restaurar; `false` para no mostrar toast */
  restoreMessage?: string | false;
};

export type UseFormDraftResult = {
  clearDraft: () => void;
};

export function useFormDraft<T extends FieldValues>({
  draftKey,
  form,
  defaultValues,
  excludeFields = [],
  extra,
  isReady = true,
  enabled = true,
  restoreMessage = "Se restauró un borrador sin guardar.",
}: UseFormDraftOptions<T>): UseFormDraftResult {
  const { watch, reset, getValues } = form;
  const restoredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baselineRef = useRef(defaultValues);

  useEffect(() => {
    baselineRef.current = defaultValues;
  }, [defaultValues]);

  const clearDraft = useCallback(() => {
    clearFormDraft(draftKey);
  }, [draftKey]);

  const persistDraft = useCallback(() => {
    if (!enabled) return;
    const values = getValues() as Record<string, unknown>;
    const baseline = baselineRef.current as Record<string, unknown>;
    if (!hasMeaningfulDraftDiff(values, baseline, excludeFields)) {
      clearFormDraft(draftKey);
      return;
    }
    const toStore = omitFields(values, excludeFields) as T;
    saveFormDraft(draftKey, toStore, extra?.get());
  }, [draftKey, enabled, excludeFields, extra, getValues]);

  useEffect(() => {
    if (!enabled || !isReady || restoredRef.current) return;

    const stored = loadFormDraft<T>(draftKey);
    restoredRef.current = true;

    if (!stored?.values) return;

    const baseline = baselineRef.current as Record<string, unknown>;
    const merged = {
      ...baseline,
      ...omitFields(stored.values as Record<string, unknown>, excludeFields),
    };

    if (!hasMeaningfulDraftDiff(merged, baseline, excludeFields)) {
      if (stored.extra !== undefined) extra?.apply(stored.extra);
      return;
    }

    reset(merged as T, { keepDefaultValues: false });
    if (stored.extra !== undefined) extra?.apply(stored.extra);

    if (restoreMessage !== false) {
      toast.info(restoreMessage, { duration: 4000 });
    }
  }, [
    draftKey,
    enabled,
    excludeFields,
    extra,
    isReady,
    reset,
    restoreMessage,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = watch(() => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        persistDraft();
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [enabled, persistDraft, watch]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (enabled) persistDraft();
    };
  }, [enabled, persistDraft]);

  return { clearDraft };
}
