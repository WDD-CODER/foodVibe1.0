// Pure utility — no Angular imports. Reusable across all AI entity phases.

export function normalizeHebrew(s: string): string {
  return s
    .normalize('NFD')
    // strip niqqud (U+0591–U+05C7) and other Hebrew combining marks
    .replace(/[\u0591-\u05C7]/g, '')
    .toLowerCase()
    // strip common punctuation
    .replace(/[.,;:!?'"()\[\]{}/\\-]/g, ' ')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function levenshteinRatio(a: string, b: string): number {
  const dist = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - dist / maxLen
}

export interface MatchCandidate {
  recipeId: string
  name: string
  confidence: number
}

export interface MatchResult {
  bestMatch: MatchCandidate | null
  candidates: MatchCandidate[]
  status: 'matched' | 'ambiguous' | 'unmatched'
}

export function matchRecipeName<T extends { _id: string; name_hebrew: string }>(
  query: string,
  records: T[],
): MatchResult {
  const normQuery = normalizeHebrew(query)

  const scored: MatchCandidate[] = records.map((r) => {
    const normName = normalizeHebrew(r.name_hebrew)
    let confidence: number

    if (normName === normQuery) {
      confidence = 1.0
    } else if (normName.startsWith(normQuery) || normQuery.startsWith(normName)) {
      confidence = 0.9
    } else if (normName.includes(normQuery) || normQuery.includes(normName)) {
      confidence = 0.7
    } else {
      confidence = levenshteinRatio(normQuery, normName)
    }

    return { recipeId: r._id, name: r.name_hebrew, confidence }
  })

  scored.sort((a, b) => b.confidence - a.confidence)

  const top3 = scored.slice(0, 3)
  const best = top3[0] ?? null
  const second = top3[1] ?? null

  let status: 'matched' | 'ambiguous' | 'unmatched'

  if (!best || best.confidence <= 0) {
    status = 'unmatched'
  } else if (
    best.confidence > 0.85 &&
    (!second || second.confidence < 0.55 || best.confidence - second.confidence > 0.3)
  ) {
    status = 'matched'
  } else if (top3.filter((c) => c.confidence > 0.55).length >= 2) {
    status = 'ambiguous'
  } else {
    status = 'unmatched'
  }

  return { bestMatch: best, candidates: top3, status }
}
