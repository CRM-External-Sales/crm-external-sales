const STORAGE_PREFIX = "crm-form-draft:v1:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type StoredFormDraft<TValues = Record<string, unknown>> = {
  values: TValues;
  extra?: unknown;
  updatedAt: number;
};

function storageKey(draftKey: string): string {
  return `${STORAGE_PREFIX}${draftKey}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadFormDraft<TValues>(
  draftKey: string,
): StoredFormDraft<TValues> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(draftKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFormDraft<TValues>;
    if (!parsed?.values || typeof parsed.updatedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(storageKey(draftKey));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveFormDraft<TValues>(
  draftKey: string,
  values: TValues,
  extra?: unknown,
): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredFormDraft<TValues> = {
      values,
      ...(extra !== undefined ? { extra } : {}),
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(storageKey(draftKey), JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function clearFormDraft(draftKey: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(storageKey(draftKey));
  } catch {
    /* ignore */
  }
}

export function omitFields<T extends Record<string, unknown>>(
  values: T,
  fields: string[],
): Partial<T> {
  if (fields.length === 0) return values;
  const out = { ...values };
  for (const field of fields) {
    delete out[field];
  }
  return out;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(value, (_, v) => (v === undefined ? null : v));
}

export function hasMeaningfulDraftDiff(
  current: Record<string, unknown>,
  baseline: Record<string, unknown>,
  excludeFields: string[] = [],
): boolean {
  const a = omitFields(current, excludeFields);
  const b = omitFields(baseline, excludeFields);
  return stableSerialize(a) !== stableSerialize(b);
}
