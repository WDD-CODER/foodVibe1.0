/** One pasted ingredient line: either read into amount, unit and name, or kept as the original text. */
export type ParsedLine = { kind: 'parsed'; amount: number; unit: string; name: string } | { kind: 'text'; text: string }

/** Maps a unit word ("ק"ג", "גרם", "cup") to a canonical unit key, or null when it is not a unit. */
export type UnitResolver = (token: string) => string | null

const VULGAR_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }
const FRACTION_CHARS = Object.keys(VULGAR_FRACTIONS).join('')

const MIXED_SLASH = /^(\d+)\s+(\d+)\s*\/\s*(\d+)(?=\s|$|\D)/
const MIXED_VULGAR = new RegExp(`^(\d+)\s*([${FRACTION_CHARS}])`)
const SLASH = /^(\d+)\s*\/\s*(\d+)/
const VULGAR = new RegExp(`^([${FRACTION_CHARS}])`)
const DECIMAL = /^(\d+(?:[.,]\d+)?)/

/** Gershayim and prime marks become a plain double quote so "ק״ג" and "ק"ג" read the same. */
function normalizeQuotes(s: string): string {
  return s.replace(/[״″”“]/g, '"').replace(/[׳′’‘]/g, "'")
}

function readLeadingNumber(s: string): { value: number; rest: string } | null {
  let m = MIXED_SLASH.exec(s)
  if (m) {
    const den = Number(m[3])
    if (den === 0) return null
    return { value: Number(m[1]) + Number(m[2]) / den, rest: s.slice(m[0].length) }
  }
  m = MIXED_VULGAR.exec(s)
  if (m) return { value: Number(m[1]) + VULGAR_FRACTIONS[m[2]], rest: s.slice(m[0].length) }
  m = SLASH.exec(s)
  if (m) {
    const den = Number(m[2])
    if (den === 0) return null
    return { value: Number(m[1]) / den, rest: s.slice(m[0].length) }
  }
  m = VULGAR.exec(s)
  if (m) return { value: VULGAR_FRACTIONS[m[1]], rest: s.slice(m[0].length) }
  m = DECIMAL.exec(s)
  if (m) return { value: Number(m[1].replace(',', '.')), rest: s.slice(m[0].length) }
  return null
}

/**
 * Reads pasted ingredient lines ("2 ק"ג עגבניות"), one per line. A line that cannot be read
 * (no leading number, or nothing after it) is kept as `{ kind: 'text' }` with its original text — never dropped.
 * Blank lines are skipped.
 */
export function parseIngredientLines(text: string, resolveUnit: UnitResolver): ParsedLine[] {
  const result: ParsedLine[] = []
  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const original = rawLine.trim()
    if (!original) continue
    const line = normalizeQuotes(original)
      .replace(/^[-•*·–]\s*/, '')
      .trim()
    const num = readLeadingNumber(line)
    const rest = num ? num.rest.trim() : ''
    if (!num || !rest || !(num.value > 0)) {
      result.push({ kind: 'text', text: original })
      continue
    }
    const [firstToken, ...others] = rest.split(/\s+/)
    const unit = resolveUnit(firstToken)
    if (unit) {
      const name = others.join(' ').trim()
      if (!name) {
        result.push({ kind: 'text', text: original })
        continue
      }
      result.push({ kind: 'parsed', amount: num.value, unit, name })
    } else {
      result.push({ kind: 'parsed', amount: num.value, unit: 'unit', name: rest })
    }
  }
  return result
}
