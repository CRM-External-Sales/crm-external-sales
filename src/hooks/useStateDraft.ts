"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";

import {
  clearFormDraft,
  hasMeaningfulDraftDiff,
  loadFormDraft,
  saveFormDraft,
} from "@/lib/form-draft-storage";

const SAVE_DEBOUNCE_MS = 500;

export type UseStateDraftOptions = {
  enabled?: boolean;
  restoreMessage?: string | false;
};

export type UseStateDraftResult = {
  clearDraft: () => void;
};

export function useStateDraft<T extends object>(
  draftKey: string,
  initialState: T | (() => T),
  options: UseStateDraftOptions = {},
): [T, Dispatch<SetStateAction<T>>, UseStateDraftResult] {
  const { enabled = true, restoreMessage = "Se restauró un borrador sin guardar." } =
    options;

  const resolveInitial = useCallback((): T => {
    return typeof initialState === "function"
      ? (initialState as () => T)()
      : initialState;
  }, [initialState]);

  const baselineRef = useRef<T>(resolveInitial());
  const restoredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [value, setValue] = useState<T>(() => {
    if (!enabled) return resolveInitial();
    const stored = loadFormDraft<T>(draftKey);
    if (stored?.values) {
      restoredRef.current = true;
      return { ...resolveInitial(), ...stored.values };
    }
    return resolveInitial();
  });

  const clearDraft = useCallback(() => {
    clearFormDraft(draftKey);
  }, [draftKey]);

  const persistDraft = useCallback(
    (current: T) => {
      if (!enabled) return;
      const baseline = baselineRef.current as Record<string, unknown>;
      if (!hasMeaningfulDraftDiff(current as Record<string, unknown>, baseline)) {
        clearFormDraft(draftKey);
        return;
      }
      saveFormDraft(draftKey, current);
    },
    [draftKey, enabled],
  );

  useEffect(() => {
    if (!enabled || !restoredRef.current || restoreMessage === false) return;
    if (
      hasMeaningfulDraftDiff(
        value as Record<string, unknown>,
        baselineRef.current as Record<string, unknown>,
      )
    ) {
      toast.info(restoreMessage, { duration: 4000 });
    }
    restoredRef.current = false;
  }, [enabled, restoreMessage, value]);

  useEffect(() => {
    if (!enabled) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistDraft(value);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [enabled, persistDraft, value]);

  useEffect(() => {
    return () => {
      if (enabled) persistDraft(value);
    };
  }, [enabled, persistDraft, value]);

  return [value, setValue, { clearDraft }];
}
