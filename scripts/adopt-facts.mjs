#!/usr/bin/env node
/**
 * Adopt Check facts: the facts behind a plan's "## Adopt Check" row come from this script, never from the
 * agent. Node built-ins only (fetch); no install, no child process.
 *
 *   node scripts/adopt-facts.mjs --pkg=<name>[,<name>…]
 *
 * Per package: licence, latest release date, weekly downloads, peer dependencies against the versions in the
 * project's root package.json (the current folder), and the npm advisories for the latest version.
 * FAIL lines (exit 1): not found on the registry; no release in the last 12 months; a GPL / AGPL / unknown licence
 * (allowed only with "license-ok: Human YYYY-MM-DD" on the plan row). A peer mismatch is a fact, not a FAIL.
 * A blocked or failing network prints "ADOPT_FACTS: skipped — network" and exits 0 — one request, never retried.
 *
 * Tests: --fixtures=<dir> reads <dir>/<name>.json ({ registry, downloads, advisories }; "/" in a scoped name is "__")
 * instead of the network; --registry-url=<url> points both npm hosts at <url>; --now=YYYY-MM-DD fixes today.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { COPYLEFT_RE } from './lib/adopt-check.mjs'

const STALE_DAYS = 365
const DAY = 86400000

function parseArgs(argv) {
  const out = {}
  for (const a of argv) {
    if (!a.startsWith('--')) continue
    const eq = a.indexOf('=')
    if (eq >= 0) out[a.slice(2, eq)] = a.slice(eq + 1)
    else out[a.slice(2)] = true
  }
  return out
}

class NetworkError extends Error {}

/** One source of npm data: the recorded fixtures, or the network (registry, downloads API, bulk advisories). */
function source(args) {
  if (args.fixtures && args.fixtures !== true) {
    const read = (name) => {
      const f = join(String(args.fixtures), `${name.replace(/\//g, '__')}.json`)
      return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null
    }
    return {
      registry: async (name) => read(name)?.registry ?? null,
      downloads: async (name) => read(name)?.downloads?.downloads ?? null,
      advisories: async (name) => read(name)?.advisories?.[name] ?? [],
    }
  }
  const base = typeof args['registry-url'] === 'string' ? args['registry-url'].replace(/\/$/, '') : null
  const registryHost = base ?? 'https://registry.npmjs.org'
  const downloadsHost = base ?? 'https://api.npmjs.org'
  const call = async (url, init) => {
    let res
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) })
    } catch {
      throw new NetworkError(url)
    }
    if (res.status === 404) return null
    if (!res.ok) throw new NetworkError(`${url}: ${res.status}`)
    try { return await res.json() } catch { throw new NetworkError(url) }
  }
  return {
    registry: (name) => call(`${registryHost}/${name.replace('/', '%2F')}`),
    downloads: async (name) => (await call(`${downloadsHost}/downloads/point/last-week/${name}`))?.downloads ?? null,
    advisories: async (name, version) => {
      const body = await call(`${registryHost}/-/npm/v1/security/advisories/bulk`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [name]: [version] }),
      })
      return body?.[name] ?? []
    },
  }
}

/** The project's own versions: dependencies, devDependencies and peerDependencies of ./package.json. */
function projectVersions(cwd) {
  const f = join(cwd, 'package.json')
  if (!existsSync(f)) return {}
  try {
    const p = JSON.parse(readFileSync(f, 'utf8'))
    return { ...(p.peerDependencies || {}), ...(p.devDependencies || {}), ...(p.dependencies || {}) }
  } catch {
    return {}
  }
}

const majorOf = (v) => { const m = String(v).match(/(\d+)/); return m ? Number(m[1]) : null }
/** The major versions a peer range names (`^19.0.0 || ^20.0.0` → 19, 20; `>=18` → >=18). */
function peerFits(range, projectVersion) {
  const mine = majorOf(projectVersion)
  if (mine === null || /^(?:\*|latest|x)$/i.test(String(range).trim())) return 'unchecked'
  for (const part of String(range).split('||')) {
    const p = part.trim()
    const n = majorOf(p)
    if (n === null) return 'unchecked'
    if (/^>=?/.test(p) ? mine >= n : mine === n) return 'ok'
  }
  return 'mismatch'
}

const isoDay = (d) => new Date(d).toISOString().slice(0, 10)
const daysBetween = (a, b) => Math.round((Date.parse(isoDay(b)) - Date.parse(isoDay(a))) / DAY)

async function factsFor(name, src, today, mine) {
  const lines = []
  const fails = []
  const reg = await src.registry(name)
  if (!reg) {
    fails.push(`FAIL ${name}: not found on the registry`)
    return { lines: [`ADOPT_FACTS: ${name}`], fails }
  }
  const version = reg['dist-tags']?.latest ?? ''
  const meta = reg.versions?.[version] ?? {}
  const rawLicense = meta.license ?? reg.license
  const license = (typeof rawLicense === 'object' && rawLicense ? rawLicense.type : rawLicense) || 'unknown'
  const released = reg.time?.[version] ?? reg.time?.modified ?? null
  lines.push(`ADOPT_FACTS: ${name}@${version}`)
  lines.push(`  license: ${license}`)
  if (released) {
    const age = daysBetween(released, today)
    lines.push(`  latest release: ${isoDay(released)} (${age} days ago)`)
    if (age > STALE_DAYS) fails.push(`FAIL ${name}: no release in the last 12 months (last ${isoDay(released)})`)
  } else {
    lines.push('  latest release: unknown')
    fails.push(`FAIL ${name}: no release date on the registry`)
  }
  const downloads = await src.downloads(name)
  lines.push(`  weekly downloads: ${downloads ?? 'unknown'}`)
  const peers = Object.entries(meta.peerDependencies || {})
  if (!peers.length) lines.push('  peers: none')
  for (const [peer, range] of peers) {
    lines.push(mine[peer] ? `  peer ${peer} ${range} vs project ${mine[peer]}: ${peerFits(range, mine[peer])}` : `  peer ${peer} ${range}: not in the project`)
  }
  const adv = await src.advisories(name, version)
  lines.push(adv.length ? `  advisories: ${adv.length} (${adv.map((a) => `${a.severity}: ${a.title}`).join('; ')})` : '  advisories: none')
  if (COPYLEFT_RE.test(String(license).trim())) fails.push(`FAIL ${name}: licence ${license} — allowed only with "license-ok: Human YYYY-MM-DD" on the plan row`)
  return { lines, fails }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const names = typeof args.pkg === 'string' ? args.pkg.split(',').map((s) => s.trim()).filter(Boolean) : []
  if (!names.length) {
    console.error('ADOPT_FACTS: usage: node scripts/adopt-facts.mjs --pkg=<name>[,<name>...]')
    return 2
  }
  const today = typeof args.now === 'string' ? args.now : new Date().toISOString()
  const src = source(args)
  const mine = projectVersions(process.cwd())
  const out = []
  const fails = []
  for (const [i, name] of names.entries()) {
    let r
    try {
      r = await factsFor(name, src, today, mine)
    } catch (e) {
      if (!(e instanceof NetworkError)) throw e
      // Keep what the packages before it found (their FAILs too); never retry.
      for (const l of out) console.log(l)
      console.log('ADOPT_FACTS: skipped — network')
      console.log(`  not checked: ${names.slice(i).join(', ')}`)
      return fails.length ? 1 : 0
    }
    out.push(...r.lines, ...r.fails.map((f) => `  ${f}`))
    fails.push(...r.fails)
  }
  for (const l of out) console.log(l)
  console.log(fails.length ? `ADOPT_FACTS: fail (${fails.length})` : 'ADOPT_FACTS: ok')
  return fails.length ? 1 : 0
}

process.exitCode = await main()
