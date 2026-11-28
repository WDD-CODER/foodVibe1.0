/** The dictionary key shown when the business reached its monthly AI cap (plan 617 answers 429 `ai_monthly_cap_reached`). */
export const AI_MONTHLY_CAP_KEY = 'ai_monthly_cap_reached'

/** Plan 736: the code of the server's 402 when the user's lifetime AI allowance is over. */
export const AI_BUDGET_EXHAUSTED_CODE = 'AI_BUDGET_EXHAUSTED'
/** Plan 736: the short inline line the AI screens show for that refusal (the toast carries the email). */
export const AI_BUDGET_SHORT_KEY = 'ai_budget_exhausted_short'
/** Plan 736: the toast's dictionary key; `{{email}}` is the contact address. */
export const AI_BUDGET_TOAST_KEY = 'ai_budget_exhausted'
/** Plan 736: whom to write for more AI requests when the answer does not name it (same default as the server). */
export const AI_BUDGET_CONTACT_EMAIL = 'dan.weibren@gmail.com'

function bodyOf(err: unknown): Record<string, unknown> | null {
  if (typeof err !== 'object' || err === null) return null
  const body = (err as { error?: unknown }).error
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null
}

/** True for the server's 402 `AI_BUDGET_EXHAUSTED` (the user's AI allowance is over). */
export function isAiBudgetExhausted(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  return (err as { status?: unknown }).status === 402 && bodyOf(err)?.['code'] === AI_BUDGET_EXHAUSTED_CODE
}

/** The address the budget answer names, or the default. */
export function aiBudgetContactEmail(err: unknown): string {
  const email = bodyOf(err)?.['contactEmail']
  return typeof email === 'string' && email.trim() ? email.trim() : AI_BUDGET_CONTACT_EMAIL
}

/** The toast text for the budget answer: the dictionary line with `{{email}}` filled in. */
export function aiBudgetMessage(err: unknown, translator: { translate(key: string): string }): string {
  return translator.translate(AI_BUDGET_TOAST_KEY).replace('{{email}}', aiBudgetContactEmail(err))
}

/**
 * `ai_monthly_cap_reached` for the server's monthly-cap refusal, `ai_budget_exhausted_short` for the user's
 * AI allowance being over (plan 736), else null (any other error, a 429 included).
 */
export function aiCapErrorKey(err: unknown): string | null {
  if (isAiBudgetExhausted(err)) return AI_BUDGET_SHORT_KEY
  const body = bodyOf(err)
  if (!body) return null
  return body['error'] === AI_MONTHLY_CAP_KEY ? AI_MONTHLY_CAP_KEY : null
}
