/**
 * Shared log formatter for scripts/log-query.mjs (Plan 384). Normalises the three shapes a log
 * line can have into one entry, so Mongo mode and --file mode print the same thing:
 *   - app_logs documents / client-echo JSON (Plan 382): { source, level: 'warn', event, message, context, userId, requestId, createdAt }
 *   - pino JSON (Plan 383): { level: 30|40|50, time, msg, event, req: { id }, userId }
 *   - anything else (morgan, ng serve output): passed through as level 'info', source 'raw'
 */

export const LEVELS = { info: 1, warn: 2, error: 3 }
const PINO = { 10: 'info', 20: 'info', 30: 'info', 40: 'warn', 50: 'error', 60: 'error' }
const CONTEXT_CAP = 300

export function levelRank(level) {
  return LEVELS[level] ?? 1
}

function toLevel(v) {
  if (typeof v === 'number') return PINO[v] ?? 'info'
  return Object.hasOwn(LEVELS, v) ? v : 'info'
}

function toDate(v) {
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** One raw log line (string) or document (object) -> normalised entry. Never throws. */
export function normalise(input) {
  let doc = input
  if (typeof input === 'string') {
    const line = input.trim()
    if (!line) return null
    try {
      doc = JSON.parse(line)
    } catch {
      return { time: null, level: 'info', source: 'raw', event: 'raw', userId: null, requestId: null, message: line, context: null }
    }
    if (!doc || typeof doc !== 'object') return null
  }
  const isPino = typeof doc.level === 'number' || 'msg' in doc
  const { source, event, message, msg, context, userId, requestId, req, time, createdAt, level, ...rest } = doc
  const ctx = context ?? (isPino && Object.keys(rest).length ? rest : null)
  return {
    time: toDate(createdAt ?? time),
    level: toLevel(level),
    source: source ?? (isPino ? 'server' : 'raw'),
    event: event ?? (isPino ? 'pino.log' : 'raw'),
    userId: userId ?? null,
    requestId: requestId ?? req?.id ?? null,
    message: String(message ?? msg ?? ''),
    context: ctx
  }
}

export function formatEntry(e, { full = false } = {}) {
  let ctx = e.context == null ? '' : typeof e.context === 'string' ? e.context : JSON.stringify(e.context)
  if (!full && ctx.length > CONTEXT_CAP) ctx = `${ctx.slice(0, CONTEXT_CAP)}...`
  const t = e.time ? e.time.toISOString() : '-'
  return [t, e.level, e.source, e.event, e.userId ?? '-', e.requestId ?? '-', e.message.replace(/\s+/g, ' '), ctx].join(' ').trimEnd()
}

/** Group entries by event: count, last seen, one sample message, distinct user count. */
export function summarise(entries) {
  const byEvent = new Map()
  for (const e of entries) {
    const g = byEvent.get(e.event) ?? { event: e.event, count: 0, last: null, sample: e.message, users: new Set() }
    g.count++
    if (e.time && (!g.last || e.time > g.last)) g.last = e.time
    if (e.userId) g.users.add(e.userId)
    byEvent.set(e.event, g)
  }
  return [...byEvent.values()].sort((a, b) => b.count - a.count)
}

export function formatSummary(groups) {
  if (!groups.length) return 'no entries'
  const row = (g) => [
    g.event,
    String(g.count),
    g.last ? g.last.toISOString() : '-',
    g.sample.replace(/\s+/g, ' ').slice(0, 120),
    String(g.users.size)
  ].join(' | ')
  return ['event | count | last | sample | distinct users', ...groups.map(row)].join('\n')
}

/** '15m' | '2h' | '3d' | ISO string -> Date, or null if unparseable. */
export function parseSince(v, now = Date.now()) {
  const m = /^(\d+)([mhd])$/.exec(String(v))
  if (m) return new Date(now - Number(m[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[m[2]])
  return toDate(v)
}
