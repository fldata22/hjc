const KEY_PREFIX = 'hjc_draft_';

type StoredDraft<T> = { data: T; updatedAt: string };

function key(formSlug: string, draftId: string): string {
  return `${KEY_PREFIX}${formSlug}_${draftId}`;
}

export function saveDraft<T>(formSlug: string, draftId: string, data: T): void {
  const payload: StoredDraft<T> = { data, updatedAt: new Date().toISOString() };
  localStorage.setItem(key(formSlug, draftId), JSON.stringify(payload));
}

export function loadDraft<T>(formSlug: string, draftId: string): T | null {
  const raw = localStorage.getItem(key(formSlug, draftId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    return parsed.data;
  } catch {
    return null;
  }
}

export function clearDraft(formSlug: string, draftId: string): void {
  localStorage.removeItem(key(formSlug, draftId));
}

export function listDrafts(formSlug: string): Array<{ id: string; updatedAt: string }> {
  const out: Array<{ id: string; updatedAt: string }> = [];
  const prefix = `${KEY_PREFIX}${formSlug}_`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as StoredDraft<unknown>;
      out.push({ id: k.slice(prefix.length), updatedAt: parsed.updatedAt });
    } catch {
      // skip corrupted entries
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
