// Pure utility — no Angular imports. Reusable across all AI entity phases.

export function normalizeHebrew(s: string): string {
  return (
    s
      .normalize('NFD')
      // strip niqqud (U+0591–U+05C7) and other Hebrew combining marks
      .replace(/[\u0591-\u05C7]/g, '')
      .toLowerCase()
      // strip common punctuation
      .replace(/[.,;:!?'"()\[\]{}/\\-]/g, ' ')
      // collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
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

/** Every record scored against the query, unsorted. */
function scoreRecipeNames<T extends { _id: string; nameHebrew: string }>(
  query: string,
  records: T[]
): MatchCandidate[] {
  const normQuery = normalizeHebrew(query)
  return records.map((r) => {
    const normName = normalizeHebrew(r.nameHebrew)
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

    return { recipeId: r._id, name: r.nameHebrew, confidence }
  })
}

export function matchRecipeName<T extends { _id: string; nameHebrew: string }>(
  query: string,
  records: T[]
): MatchResult {
  const scored = scoreRecipeNames(query, records)

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

// Plan 614: dish names are scored by words, in code — the AI only suggests which dishes might match.
const FILLER_WORDS = new Set([
  'עם',
  'של',
  'על',
  'את',
  'או',
  'ו',
  'מן',
  'בלי',
  'ללא',
  'ב',
  'ל',
  'ה',
  'with',
  'and',
  'of'
])
const WORD_SAME = 0.8
const COVERAGE_WEIGHT = 0.7
const NO_KEY_WORD_CAP = 0.5
const NOT_EXACT_CAP = 0.99

/** A name with its apostrophes removed, so קרפצ'יו and קרפציו are one word. */
function stripApostrophes(name: string): string {
  return name.replace(/['׳’]/g, '')
}

function nameWords(name: string): string[] {
  const all = normalizeHebrew(stripApostrophes(name)).split(' ').filter(Boolean)
  const content = all.filter((w) => !FILLER_WORDS.has(w))
  return content.length ? content : all
}

function sameWord(a: string, b: string): boolean {
  return a === b || (Math.min(a.length, b.length) >= 4 && levenshteinRatio(a, b) >= WORD_SAME)
}

/**
 * Plan 614: how close a recipe-book dish name is to the typed dish name, 0–1, from the words alone.
 * 70% = share of the typed words found in the dish name, 30% = share of the dish's words that were typed
 * (a shorter dish name that fits is closer). The first typed word is the key word: without it the score is at most 0.5.
 * Only an identical name reaches 1.
 */
export function scoreDishName(typed: string, dishName: string): number {
  if (normalizeHebrew(stripApostrophes(typed)) === normalizeHebrew(stripApostrophes(dishName))) return 1
  const q = nameWords(typed)
  const n = nameWords(dishName)
  if (!q.length || !n.length) return 0
  const found = q.filter((w) => n.some((x) => sameWord(w, x))).length
  if (found === 0) return 0
  const dishCovered = n.filter((x) => q.some((w) => sameWord(w, x))).length
  const raw = COVERAGE_WEIGHT * (found / q.length) + (1 - COVERAGE_WEIGHT) * (dishCovered / n.length)
  const keyFound = n.some((x) => sameWord(q[0], x))
  return Math.min(NOT_EXACT_CAP, keyFound ? raw : Math.min(raw, NO_KEY_WORD_CAP))
}

/** Plan 614: the dish options shown to the chef and the one preselected ('new' = keep as an unlinked dish). */
export interface DishOptions {
  options: MatchCandidate[]
  defaultChoice: string
}

const DISH_OPTIONS_MAX = 3
const DISH_FLOOR = 0.6
const DISH_GOOD = 0.7
const DISH_SURE = 0.95
const DISH_SPREAD = 0.3
const AI_ONLY_SCORE = 0.6

/** Two recipe-book dishes with the same name are one option (the best-scored one); input is sorted best first. */
function oneOfEachName(sorted: MatchCandidate[]): MatchCandidate[] {
  const seen = new Set<string>()
  return sorted.filter((c) => {
    const key = normalizeHebrew(stripApostrophes(c.name))
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Plan 614 options rule: below 0.60 out; top ≥ 0.95 alone; top 0.70–0.94 → every one ≥ 0.70
 * top 0.60–0.69 → those within 0.30 of the top. At most 3, best first.
 * Preselected: the top option when it is ≥ 0.70, else 'new'.
 */
export function pickDishOptions(candidates: MatchCandidate[]): DishOptions {
  const kept = oneOfEachName(
    candidates.filter((c) => c.confidence >= DISH_FLOOR).sort((a, b) => b.confidence - a.confidence)
  )
  const top = kept[0]
  if (!top) return { options: [], defaultChoice: 'new' }
  let options: MatchCandidate[]
  if (top.confidence >= DISH_SURE) options = [top]
  else if (top.confidence >= DISH_GOOD) options = kept.filter((c) => c.confidence >= DISH_GOOD)
  else options = kept.filter((c) => top.confidence - c.confidence <= DISH_SPREAD + 1e-9)
  options = options.slice(0, DISH_OPTIONS_MAX)
  return { options, defaultChoice: top.confidence >= DISH_GOOD ? top.recipeId : 'new' }
}

export interface MenuDishMatch extends MatchResult {
  defaultChoice: string
}

/**
 * Plan 580 + 614: a dish the AI picked from the recipe book (dishId) stays linked at 1.0. Otherwise each dish
 * scores the higher of the AI's confidence (matches) and the name match, and pickDishOptions decides what is shown.
 */
export function matchMenuDish<T extends { _id: string; nameHebrew: string }>(
  dish: { nameHebrew: string; dishId?: string; matches?: { dishId: string; confidence: number }[] },
  records: T[]
): MenuDishMatch {
  const known = dish.dishId ? records.find((r) => r._id === dish.dishId) : undefined
  if (known) {
    return {
      status: 'matched',
      bestMatch: { recipeId: known._id, name: known.nameHebrew, confidence: 1 },
      candidates: [],
      defaultChoice: known._id
    }
  }
  // The AI only says which dishes might fit; the % is ours. A dish the AI listed whose name scores low is kept at
  // AI_ONLY_SCORE (below "good", so never preselected); the AI's own confidence is not used.
  const aiIds = new Set((dish.matches ?? []).map((m) => m.dishId))
  const scored: MatchCandidate[] = records.map((r) => {
    const byName = scoreDishName(dish.nameHebrew, r.nameHebrew)
    const confidence = aiIds.has(r._id) ? Math.max(byName, AI_ONLY_SCORE) : byName
    return { recipeId: r._id, name: r.nameHebrew, confidence }
  })
  const { options, defaultChoice } = pickDishOptions(scored)
  const status = options.length === 0 ? 'unmatched' : options[0].confidence >= DISH_SURE ? 'matched' : 'ambiguous'
  return { status, bestMatch: options[0] ?? null, candidates: options, defaultChoice }
}
