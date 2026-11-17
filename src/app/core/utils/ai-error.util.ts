/** Plan 620: the dictionary key for a refusal because the business reached its monthly AI cap; null for any other error. */
export function aiCapErrorKey(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null
  const body = (err as { error?: unknown }).error
  if (!body || typeof body !== 'object') return null
  return (body as { error?: unknown }).error === 'ai_monthly_cap_reached' ? 'ai_monthly_cap_reached' : null
}
