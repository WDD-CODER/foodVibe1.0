const STORAGE_KEY = 'FV_GEMINI_USAGE'
const DAILY_LIMIT = 1000

interface GeminiUsage {
  date: string   // 'YYYY-MM-DD'
  count: number
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

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

export function incrementGeminiUsage(): GeminiUsage {
  const usage = getGeminiUsage()
  const updated: GeminiUsage = { date: todayStr(), count: usage.count + 1 }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
  return updated
}

export function isGeminiLimitReached(): boolean {
  return getGeminiUsage().count >= DAILY_LIMIT
}

export { DAILY_LIMIT }
