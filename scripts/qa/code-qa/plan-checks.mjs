/**
 * Code QA (plan 415) — numbers the checks of every docs/qa/qa-plan.md page so a code review can resume check by
 * check. Under each `## N. PAGE — …` section, every `**PAGE-…**` check (several may share a line) and the
 * closing `Responsive [T, M]:` line become `<PAGE>-C01`, `<PAGE>-C02`, … in order.
 * The ids are positional: inserting a check in qa-plan.md renumbers the ones after it in that page, which only
 * makes those checks look unreviewed (they are reviewed again), never skips one.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

/** { <PAGE>: [{ id, planId, text }] } in qa-plan.md order. */
export function planChecks(planText) {
  const pages = {}
  let page = null
  for (const line of planText.split(/\r?\n/)) {
    const h = /^##\s+\d+\.\s+([A-Z]+)\s+—/.exec(line)
    if (h) { page = h[1]; pages[page] = []; continue }
    if (/^##\s/.test(line)) { page = null; continue }
    if (!page) continue
    const add = (planId, text) => {
      const n = pages[page].length + 1
      pages[page].push({ id: `${page}-C${String(n).padStart(2, '0')}`, planId, text: text.trim() })
    }
    const marks = [...line.matchAll(/\*\*([A-Z]+-\d+[^*]*?)\*\*/g)].filter((m) => m[1].startsWith(`${page}-`))
    if (marks.length) {
      marks.forEach((m, i) => {
        const end = i + 1 < marks.length ? marks[i + 1].index : line.length
        add(m[1].replace(/\s.*$/, ''), line.slice(m.index + m[0].length, end))
      })
    } else if (/^Responsive\b/.test(line)) add('responsive', line.replace(/^Responsive[^:]*:\s*/, ''))
  }
  return pages
}

export function loadPlanChecks(root) {
  return planChecks(readFileSync(join(root, 'docs', 'qa', 'qa-plan.md'), 'utf8'))
}
