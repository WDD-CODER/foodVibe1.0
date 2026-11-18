/** The dictionary key shown when the business reached its monthly AI cap (plan 617 answers 429 `ai_monthly_cap_reached`). */
export const AI_MONTHLY_CAP_KEY = 'ai_monthly_cap_reached'

/** `ai_monthly_cap_reached` when the error is the server's monthly-cap refusal, else null (any other error, a 429 included). */
export function aiCapErrorKey(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null
  const body = (err as { error?: unknown }).error
  if (typeof body !== 'object' || body === null) return null
  return (body as { error?: unknown }).error === AI_MONTHLY_CAP_KEY ? AI_MONTHLY_CAP_KEY : null
}
