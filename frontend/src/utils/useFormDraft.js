import { useEffect, useState } from 'react';
import { loadDraft, saveDraft, clearDraft, draftStorageKey } from './formDraft';

/** Restaure et persiste automatiquement un brouillon de formulaire (localStorage). */
export function useFormDraft(page, action = 'create') {
  const key = draftStorageKey(page, action);
  const [draftRestored, setDraftRestored] = useState(false);

  const restoreDraft = (fallback) => {
    const { form, restored } = loadDraft(key, fallback);
    setDraftRestored(restored);
    return form;
  };

  const discardDraft = () => {
    clearDraft(key);
    setDraftRestored(false);
  };

  return { draftRestored, setDraftRestored, restoreDraft, discardDraft, draftKey: key };
}

/** Sauvegarde le brouillon a chaque modification tant que le modal est ouvert en mode creation. */
export function usePersistDraft(key, form, enabled) {
  useEffect(() => {
    if (enabled) saveDraft(key, form);
  }, [key, form, enabled]);
}
