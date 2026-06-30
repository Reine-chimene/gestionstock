/** Sauvegarde automatique des brouillons de formulaire dans localStorage. */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function draftStorageKey(page, action = 'create') {
  return `cro_draft_${page}_${action}`;
}

export function loadDraft(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { form: fallback, restored: false };
    return { form: { ...fallback, ...JSON.parse(raw) }, restored: true };
  } catch {
    return { form: fallback, restored: false };
  }
}

export function saveDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota depasse — ignorer */
  }
}

export function clearDraft(key) {
  localStorage.removeItem(key);
}

export function hasDraft(key) {
  return !!localStorage.getItem(key);
}
