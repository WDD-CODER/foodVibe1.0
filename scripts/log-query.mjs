/**
 * Log query for agents (Plan 384): "what went wrong, when, for whom" - against Mongo `app_logs`
 * (Plans 382/383) or a local slot log file. One line per entry, no colors, context capped at 300
 * chars, so it fits an agent's context window. Never `cat .claude/be.log` instead of this.
 *
 * Usage: node scripts/log-query.mjs [flags]   (npm run logs -- [flags])
 *   --since=<15m|2h|3d|ISO|plan-start>  default 1h; plan-start reads .claude/.slot-plan-start
 *   --until=<ISO>   --level=<info|warn|error> (minimum)   --event=<exact | prefix.>
 *   --userId=  --requestId=  --source=client|server   --limit=<n> (default 50, max 500)
 *   --summary (group by event)   --json (raw)   --full (don't truncate context)
 *   --file[=path] (parse a JSON-lines log, default .claude/be.log)
 *   --remote (Atlas; needs --yes or an interactive y)   --prune-logs (delete .claude/logs/*.log older than 14d)
 */
import { createRequire } from 'module'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs'
import { createInterface } from 'readline'
import dns from 'dns'
import dnsPromises from 'dns/promises'
import { normalise, formatEntry, summarise, formatSummary, levelRank, parseSince } from './lib/log-format.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIMIT_DEFAULT = 50
const LIMIT_MAX = 500
const PRUNE_DAYS = 14

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
const val = (name) => {
  const a = flag(name)
  return a && a.includes('=') ? a.slice(a.indexOf('=') + 1) : null
}
const has = (name) => Boolean(flag(name))
const die = (msg) => {
  console.error(`log-query: ${msg}`)
  process.exit(1)
}

if (has('prune-logs')) {
  const dir = join(ROOT, '.claude', 'logs')
  const cutoff = Date.now() - PRUNE_DAYS * 86400e3
  let n = 0
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (f.endsWith('.log') && statSync(p).mtimeMs < cutoff) { unlinkSync(p); n++ }
    }
  }
  console.log(`pruned ${n} log file(s) older than ${PRUNE_DAYS}d`)
  process.exit(0)
}

// --- filters ------------------------------------------------------------------
let sinceRaw = val('since') ?? '1h'
if (sinceRaw === 'plan-start') {
  const p = join(ROOT, '.claude', '.slot-plan-start')
  if (!existsSync(p)) die('--since=plan-start: .claude/.slot-plan-start not found (take a plan first)')
  sinceRaw = readFileSync(p, 'utf8').trim()
}
const since = parseSince(sinceRaw)
if (!since) die(`bad --since "${sinceRaw}" (use 15m, 2h, 3d, an ISO date or plan-start)`)
const until = val('until') ? parseSince(val('until')) : null
if (val('until') && !until) die(`bad --until "${val('until')}"`)
const minLevel = val('level') ?? 'info'
if (!['info', 'warn', 'error'].includes(minLevel)) die(`bad --level "${minLevel}"`)
const limit = Math.min(Math.max(Number(val('limit') ?? LIMIT_DEFAULT) || LIMIT_DEFAULT, 1), LIMIT_MAX)
const event = val('event')
const userId = val('userId')
const requestId = val('requestId')
const source = val('source')
const full = has('full')

const matches = (e) =>
  (!e.time || (e.time >= since && (!until || e.time <= until))) &&
  levelRank(e.level) >= levelRank(minLevel) &&
  (!event || (event.endsWith('.') ? e.event.startsWith(event) : e.event === event)) &&
  (!userId || e.userId === userId) &&
  (!requestId || e.requestId === requestId) &&
  (!source || e.source === source)

// --- fetch --------------------------------------------------------------------
async function fromFile() {
  const path = resolve(ROOT, val('file') ?? '.claude/be.log')
  if (!existsSync(path)) die(`log file not found: ${path}`)
  const out = []
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const e = normalise(line)
    // raw (non-JSON) lines carry no time: keep them only when no level/event filter is asked for
    if (e && matches(e) && !(e.source === 'raw' && (minLevel !== 'info' || event || userId || requestId || source))) out.push(e)
  }
  return out.reverse()
}

async function confirmRemote() {
  if (has('yes')) return
  if (!process.stdin.isTTY) die('--remote reads production logs: pass --yes to confirm')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise((r) => rl.question('Read Atlas (production) logs? [y/N] ', r))
  rl.close()
  if (!/^y/i.test(answer)) die('aborted')
}

async function fromMongo() {
  const remote = has('remote')
  const require = createRequire(resolve(ROOT, 'server', 'package.json'))
  const { MongoClient } = require('mongodb')
  const { config } = require('dotenv')
  config({ path: resolve(ROOT, 'server', '.env') })
  config({ path: resolve(ROOT, '.env') })
  const uri = remote ? (process.env.MONGO_REMOTE_URI || process.env.MONGO_URI) : (process.env.MONGO_LOCAL_URI || process.env.MONGO_URI)
  if (!uri) die(`no MongoDB URI in .env (checked ${remote ? 'MONGO_REMOTE_URI / MONGO_URI' : 'MONGO_LOCAL_URI / MONGO_URI'})`)
  if (remote) {
    await confirmRemote()
    console.log('REMOTE (Atlas)')
  }
  if (uri.startsWith('mongodb+srv://')) {
    const host = (uri.match(/@([^/?]+)/) || uri.match(/:\/\/([^/?]+)/))?.[1]
    try { await dnsPromises.resolveSrv(`_mongodb._tcp.${host}`) } catch (err) {
      if (err.code === 'ECONNREFUSED') dns.setServers(['8.8.8.8', '1.1.1.1'])
    }
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  try {
    await client.connect()
    const q = { createdAt: { $gte: since, ...(until ? { $lte: until } : {}) } }
    if (minLevel === 'warn') q.level = { $in: ['warn', 'error'] }
    if (minLevel === 'error') q.level = 'error'
    // events are lowercase dotted names, so '.' is the only regex metacharacter to neutralise
    if (event) q.event = event.endsWith('.') ? { $regex: `^${event.replaceAll('.', '[.]')}` } : event
    if (userId) q.userId = userId
    if (requestId) q.requestId = requestId
    if (source) q.source = source
    // db name comes from the URI path; app_logs lives in the app DB
    const docs = await client.db().collection('app_logs').find(q).sort({ createdAt: -1 }).limit(has('summary') ? LIMIT_MAX * 20 : limit).toArray()
    return docs.map(normalise).filter(Boolean)
  } catch (err) {
    die(`mongo query failed: ${err.message}`)
  } finally {
    await client.close().catch(() => {})
  }
}

const entries = has('file') ? await fromFile() : await fromMongo()

if (has('json')) console.log(JSON.stringify(entries.slice(0, limit), null, 0))
else if (has('summary')) console.log(formatSummary(summarise(entries)))
else console.log(entries.length ? entries.slice(0, limit).map((e) => formatEntry(e, { full })).join('\n') : 'no entries')
