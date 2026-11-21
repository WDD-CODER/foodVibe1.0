'use strict'
/** Plan 630: pure grouping of AI draft rows into flow x model x week. No database. */

/** The Sunday (YYYY-MM-DD) that starts the Sunday-to-Saturday week of a YYYY-MM-DD day. */
function weekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

function isScore(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
}

const DAY_MS = 24 * 3600 * 1000

function summarize(rows, now) {
  const confirmedRows = rows.filter(r => r.status === 'confirmed')
  const scores = confirmedRows.map(r => r.keptRatio).filter(isScore)
  const avgKeptRatio = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10000) / 10000
    : null
  const abandoned = rows.filter(r => r.status === 'pending' && now - r.at > DAY_MS).length
  const confirmedRate = rows.length ? Math.round((confirmedRows.length / rows.length) * 100) / 100 : 0
  return {
    drafts: rows.length,
    confirmed: confirmedRows.length,
    confirmedCount: confirmedRows.length,
    confirmedRate,
    abandoned,
    avgKeptRatio
  }
}

/** `dayOf(ms)` -> the YYYY-MM-DD day (the route passes jerusalemDate). */
function buildLearningStats(drafts, { dayOf, now = Date.now() }) {
  const groups = new Map()
  for (const d of drafts) {
    const model = typeof d.model === 'string' && d.model ? d.model : null
    const key = JSON.stringify([d.feature, model])
    if (!groups.has(key)) groups.set(key, { feature: d.feature, model, rows: [] })
    groups.get(key).rows.push(d)
  }
  const flows = [...groups.values()].map(g => {
    const byWeek = new Map()
    for (const r of g.rows) {
      const week = weekStart(dayOf(r.at))
      if (!byWeek.has(week)) byWeek.set(week, [])
      byWeek.get(week).push(r)
    }
    const weeks = [...byWeek.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([week, rows]) => ({ week, ...summarize(rows, now) }))
    return { feature: g.feature, model: g.model, ...summarize(g.rows, now), weeks }
  })
  flows.sort((a, b) => {
    if (a.feature !== b.feature) return a.feature < b.feature ? -1 : 1
    if (a.model === b.model) return 0
    if (a.model === null) return 1
    if (b.model === null) return -1
    return a.model < b.model ? -1 : 1
  })
  return flows
}

module.exports = { weekStart, buildLearningStats }
