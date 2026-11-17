/**
 * The debt ratchet: a committed baseline of the project's debt counts that may fall but never rise.
 *
 * File (paths.debtBaseline, default docs/project/debt-baseline.json):
 *   { "version": 1, "counts": { "<kind>": { "total": n, "files": { "<path>": n } } } }
 * A missing file, or a kind the file does not list, counts as zero — a new project starts clean and stays clean.
 * Counts come from the checks' `counts(ctx)` as { kind: { file: n } } (scripts/lib/checks/README.md). Only debt is
 * counted (copies, raw values, gaps), never the number of classes or components.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export const EMPTY = Object.freeze({ version: 1, counts: {} })

/** { kind: { file: n } } (several checks may add to one kind) → { kind: { total, files } }, zero entries dropped. */
export function normalizeCounts(...parts) {
  const out = {}
  for (const part of parts) {
    for (const [kind, files] of Object.entries(part ?? {})) {
      const k = (out[kind] ??= { total: 0, files: {} })
      for (const [file, n] of Object.entries(files ?? {})) {
        const v = Number(n) || 0
        if (v <= 0) continue
        k.files[file] = (k.files[file] ?? 0) + v
        k.total += v
      }
    }
  }
  for (const k of Object.values(out)) k.files = Object.fromEntries(Object.entries(k.files).sort(([a], [b]) => a.localeCompare(b)))
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

/** The baseline at `rel` under `root`; a missing file is EMPTY, a file that does not parse throws naming it. */
export function readBaseline(root, rel) {
  const abs = join(root, rel)
  if (!existsSync(abs)) return structuredClone(EMPTY)
  let data
  try {
    data = JSON.parse(readFileSync(abs, 'utf8'))
  } catch (e) {
    throw new Error(`${rel} is not valid JSON: ${e.message}`)
  }
  if (!data || typeof data !== 'object' || typeof data.counts !== 'object' || data.counts === null) throw new Error(`${rel} has no "counts" object`)
  return { version: 1, counts: data.counts }
}

export function writeBaseline(root, rel, counts) {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, `${JSON.stringify({ version: 1, counts }, null, 2)}\n`)
}

const totalOf = (baseline, kind) => Number(baseline.counts?.[kind]?.total) || 0

/**
 * current (normalized) vs baseline → { raised: [{ kind, old, now, files }], fell: [{ kind, old, now }] }.
 * `files` are the paths whose count is above the baseline's count for that path (new debt lives there).
 */
export function compare(current, baseline) {
  const raised = []
  const fell = []
  const kinds = new Set([...Object.keys(current), ...Object.keys(baseline.counts ?? {})])
  for (const kind of [...kinds].sort()) {
    const old = totalOf(baseline, kind)
    const now = current[kind]?.total ?? 0
    if (now > old) {
      const was = baseline.counts?.[kind]?.files ?? {}
      const files = Object.entries(current[kind].files).filter(([f, n]) => n > (Number(was[f]) || 0)).map(([f]) => f)
      raised.push({ kind, old, now, files })
    } else if (now < old) fell.push({ kind, old, now })
  }
  return { raised, fell }
}

/**
 * The baseline after `--add-kind <kind>`: the kind joins at its current counts (zero when no check counts it yet).
 * Throws, writing nothing, for a kind the baseline already has.
 */
export function withKind(current, baseline, kind) {
  if (!kind || typeof kind !== 'string') throw new Error('refused: --add-kind needs a kind name')
  if (Object.hasOwn(baseline.counts ?? {}, kind)) throw new Error(`refused: the baseline already has ${kind} — use --lower to lower it`)
  const counts = structuredClone(baseline.counts ?? {})
  counts[kind] = current[kind] ?? { total: 0, files: {} }
  return { counts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))), added: { kind, now: counts[kind].total } }
}

/**
 * The baseline after `--lower`: every kind that fell takes its current counts; nothing rises and no kind is added.
 * Returns { counts, changed } or throws while any kind rose (nothing is written then).
 */
export function lowered(current, baseline) {
  const { raised, fell } = compare(current, baseline)
  if (raised.length) throw new Error(`refused: debt rose (${raised.map((r) => `${r.kind} ${r.old} → ${r.now}`).join(', ')}) — fix it before lowering the baseline`)
  const counts = structuredClone(baseline.counts ?? {})
  for (const f of fell) {
    if (current[f.kind]) counts[f.kind] = current[f.kind]
    else counts[f.kind] = { total: 0, files: {} }
  }
  return { counts, changed: fell }
}
