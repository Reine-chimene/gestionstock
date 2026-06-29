/** Convertit les erreurs FastAPI (detail string ou tableau Pydantic) en message lisible. */
export function formatApiError(error, fallback = 'Une erreur est survenue') {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || String(item)).join(' ');
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  return fallback;
}
