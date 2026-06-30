import { MAX_UPLOAD_BYTES } from './formDraft';

export function validateFileSize(file, maxBytes = MAX_UPLOAD_BYTES) {
  if (!file) return null;
  if (file.size > maxBytes) {
    const maxMo = (maxBytes / (1024 * 1024)).toFixed(0);
    return `Fichier trop volumineux (max ${maxMo} Mo).`;
  }
  return null;
}

export const UPLOAD_HINT = 'Taille max : 4 Mo';

export function downloadStatic(url, filename = 'document') {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.click();
}
