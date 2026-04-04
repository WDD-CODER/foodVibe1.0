/**
 * Gemini usage tracking — server-side source of truth.
 *
 * The daily counter lives in MongoDB (GEMINI_USAGE collection).
 * This util fetches the current count from the server so ALL users
 * and the catalog seeder share the same 1,000 calls/day limit.
 *
 * localStorage is kept only as a fast optimistic cache between fetches.
 */

import { environment } from '../../../environments/environment'

const STORAGE_KEY = 'FV_GEMINI_USAGE'
export const DAILY_LIMIT = 1000

export interface GeminiUsage {
  date: string   // 'YYYY-MM-DD'
  count: number
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Local cache helpers (optimistic, fast — used while the fetch is in-flight)
// ---------------------------------------------------------------------------

export function getGeminiUsage(): GeminiUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { date: todayStr(), count: 0 }
    const parsed: GeminiUsage = JSON.parse(raw)
    if (parsed.date !== todayStr()) return { date: todayStr(), count: 0 }
    return parsed
  } catch {
    return { date: todayStr(), count: 0 }
  }
}

export function setGeminiUsageCache(usage: GeminiUsage): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(usage)) } catch { /* ignore */ }
}

export function incrementGeminiUsage(): GeminiUsage {
  const usage = getGeminiUsage()
  const updated: GeminiUsage = { date: todayStr(), count: usage.count + 1 }
  setGeminiUsageCache(updated)
  return updated
}

export function isGeminiLimitReached(): boolean {
  return getGeminiUsage().count >= DAILY_LIMIT
}

// ---------------------------------------------------------------------------
// Server fetch — call this to get the real global count from MongoDB
// ---------------------------------------------------------------------------

export async function fetchGeminiUsageFromServer(): Promise<GeminiUsage> {
  try {
    const res = await fetch(`${environment.authApiUrl}/api/v1/ai/usage`)
    if (!res.ok) return getGeminiUsage()
    const data = await res.json() as { date: string; count: number }
    const usage: GeminiUsage = { date: data.date, count: data.count }
    setGeminiUsageCache(usage)  // update local cache with server truth
    return usage
  } catch {
    return getGeminiUsage()  // fall back to local cache on network error
  }
}
