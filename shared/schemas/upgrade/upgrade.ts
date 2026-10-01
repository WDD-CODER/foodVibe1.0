import { FIELD_MAP_V1_TO_V2, type KeyMap } from '../field-map.v1-to-v2'

export interface UpgradeResult {
  doc: Record<string, unknown>
  /** Paths of keys present in the v1 doc that the field map doesn't cover (dot-paths, e.g. `steps_[].foo`). */
  unmapped: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function applyMap(src: Record<string, unknown>, map: KeyMap, path: string, unmapped: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(src)) {
    const rule = map[key]
    if (rule === undefined) {
      unmapped.push(path + key)
      continue
    }
    if (rule === null) continue
    if (typeof rule === 'string') {
      out[rule] = raw
      continue
    }
    let value = rule.fn ? rule.fn(raw) : raw
    if (rule.each && Array.isArray(value)) {
      const each = rule.each
      value = value.map((el) => (isRecord(el) ? applyMap(el, each, `${path}${key}[].`, unmapped) : el))
    } else if (rule.obj && isRecord(value)) {
      value = applyMap(value, rule.obj, `${path}${key}.`, unmapped)
    }
    out[rule.to] = value
  }
  return out
}

/**
 * Pure v1 → v2 upgrade of one stored document (Plan 321 Phase 2a). Total by construction:
 * every key is mapped, renamed, dropped explicitly, or reported in `unmapped`.
 * Collections without a map are returned untouched with an `unmapped: []` result.
 */
export function upgradeV1toV2(type: string, doc: Record<string, unknown>): UpgradeResult {
  const map = FIELD_MAP_V1_TO_V2[type]
  if (!map) return { doc, unmapped: [] }
  const unmapped: string[] = []
  const out = applyMap(doc, map, '', unmapped)
  out['schemaVersion'] = 2
  return { doc: out, unmapped }
}
