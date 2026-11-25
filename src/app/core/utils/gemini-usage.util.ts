/**
 * Gemini usage tracking — server-side source of truth.
 *
 * The daily call counter and each model's daily-quota state live on the server
 * (GEMINI_USAGE collection, plan 395). Google's free tier is per model per day, and the
 * server falls back along a model chain when one model's quota runs out. The indicator
 * shows the chain's budget for today — used / total, and what is left — shared by all users.
 *
 * localStorage is kept only as a fast optimistic cache between fetches. The fetch itself is
 * GeminiService.fetchUsage() (plan 456: through HttpClient, so the auth interceptor runs).
 */

const STORAGE_KEY = 'FV_GEMINI_USAGE'

export interface GeminiModelStatus {
  name: string
  exhausted: boolean
  resetAt: string | null
  dailyBudget: number | null
  used: number
  remaining: number | null
}

/** Plan 736: the signed-in user's own lifetime AI allowance (`mine` of `/ai/usage`). */
export interface GeminiUserAllowance {
  allowance: number
  used: number
  remaining: number
  unlimited: boolean
}

export interface GeminiUsage {
  date: string // 'YYYY-MM-DD'
  count: number
  budget: number // today's free calls across the model chain (shared by all users)
  used: number
  remaining: number
  models: GeminiModelStatus[]
  /** Plan 736: only with a token; never written to the shared local cache. */
  mine?: GeminiUserAllowance
}

export type GeminiUsageStatus = 'ok' | 'warning' | 'danger'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyUsage(): GeminiUsage {
  return { date: todayStr(), count: 0, budget: 0, used: 0, remaining: 0, models: [] }
}

// ---------------------------------------------------------------------------
// Local cache helpers (optimistic, fast — used while the fetch is in-flight)
// ---------------------------------------------------------------------------

export function getGeminiUsage(): GeminiUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyUsage()
    const parsed: Partial<GeminiUsage> = JSON.parse(raw)
    if (parsed.date !== todayStr()) return emptyUsage()
    return { ...emptyUsage(), ...parsed, models: parsed.models ?? [] }
  } catch {
    return emptyUsage()
  }
}

export function setGeminiUsageCache(usage: GeminiUsage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
  } catch {
    /* ignore */
  }
}

export function incrementGeminiUsage(): GeminiUsage {
  const usage = getGeminiUsage()
  const updated: GeminiUsage = {
    ...usage,
    date: todayStr(),
    count: usage.count + 1,
    used: usage.used + 1,
    remaining: Math.max(0, usage.remaining - 1)
  }
  setGeminiUsageCache(updated)
  return updated
}

// ---------------------------------------------------------------------------
// Model availability — what the usage indicator shows
// ---------------------------------------------------------------------------

export function geminiModelAvailability(usage: GeminiUsage): { available: number; total: number } {
  const total = usage.models.length
  const available = usage.models.filter((m) => !m.exhausted).length
  return { available, total }
}

/** Share of today's budget already used, 0–100 (the indicator's fill). */
export function geminiBudgetUsedPercent(usage: GeminiUsage): number {
  return usage.budget > 0 ? Math.min(100, (usage.used / usage.budget) * 100) : 0
}

/** 'danger' from 90% of today's budget used (or nothing left), 'warning' from 70%. */
export function geminiUsageStatus(usage: GeminiUsage): GeminiUsageStatus {
  if (usage.budget > 0 && usage.remaining === 0) return 'danger'
  const pct = geminiBudgetUsedPercent(usage)
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'warning'
  return 'ok'
}

// ---------------------------------------------------------------------------
// Server reply — GeminiService.fetchUsage() gets the real global state from MongoDB
// ---------------------------------------------------------------------------

/** Fills the gaps in the server's `/ai/usage` reply and stores it as the local cache. */
export function cacheServerGeminiUsage(data: Partial<GeminiUsage>): GeminiUsage {
  const usage: GeminiUsage = {
    date: data.date ?? todayStr(),
    count: data.count ?? 0,
    budget: data.budget ?? 0,
    used: data.used ?? 0,
    remaining: data.remaining ?? 0,
    models: Array.isArray(data.models) ? data.models : []
  }
  setGeminiUsageCache(usage) // update local cache with server truth
  const mine = readMine(data.mine)
  return mine ? { ...usage, mine } : usage
}

function readMine(raw: unknown): GeminiUserAllowance | null {
  if (typeof raw !== 'object' || raw === null) return null
  const m = raw as Partial<Record<keyof GeminiUserAllowance, unknown>>
  if (typeof m.allowance !== 'number' || typeof m.used !== 'number' || typeof m.remaining !== 'number') return null
  return { allowance: m.allowance, used: m.used, remaining: m.remaining, unlimited: m.unlimited === true }
}

/**
 * Plan 736: the line under the daily bar — «נשארו לך X מתוך Y קריאות AI», or the unlimited line for a platform
 * admin; '' when the answer had no `mine` (signed out, or not fetched yet).
 */
export function aiCallsLeftLine(usage: GeminiUsage, translator: { translate(key: string): string }): string {
  const mine = usage.mine
  if (!mine) return ''
  if (mine.unlimited) return translator.translate('ai_calls_unlimited')
  return translator
    .translate('ai_calls_left')
    .replace('{{left}}', String(mine.remaining))
    .replace('{{total}}', String(mine.allowance))
}
