/**
 * The first scan of an existing project: what shared pieces it already has, written once as a registry draft and a debt
 * baseline, so the reuse checks start from the project as it is.
 *
 *   node scripts/reuse-scan.mjs [--write] [--config <json file>]
 *
 * Lists the shared components (component and logic files under `reuse.sharedDirs`), the engine classes
 * (`reuse.enginePrefix` classes of `reuse.globalStylesheet`) and the tokens by kind (`styleqa.tokenFiles` and the
 * `styleqa.tokenPrefixes` kinds). With --write:
 *   - the registry (`paths.reuseRegistry`) gets a draft, one `### <id> — <title>` per shared component, when the file is
 *     missing or holds no family yet; its first line is `DRAFT — written by the kit's scan on <date>; review every family,
 *     then delete this line`. A registry that has a family is never touched.
 *   - the debt baseline (`paths.debtBaseline`) is written from every check's counts() when the file is missing or holds
 *     no counts yet (the empty seed). A baseline that has counts is never touched; it only goes down
 *     (node scripts/debt-baseline.mjs --lower).
 * Prints one `SCAN:` line with what was written. --config is a JSON object laid over the settings (tests): `reuse`,
 * `styleqa` and the kit-checks keys.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { matcher } from './lib/diff-items.mjs'
import { parseRegistry } from './lib/registry.mjs'
import { readBaseline, writeBaseline } from './lib/debt-baseline.mjs'
import { loadChecks, loadConfig, collectCounts, isEntry } from './kit-checks.mjs'

export const SCAN_SETTINGS = {
  registry: "docs/brain/component-families.md" || 'docs/brain/component-families.md',
  componentFiles: ["src/app/**/*.component.ts"],
  logicFiles: ["src/app/**/*.pipe.ts","src/app/**/*.service.ts","src/app/core/utils/**/*.ts","server/utils/**/*.js","server/services/**/*.js","server/lib/**/*.js"],
  sharedDirs: ["src/app/shared/**","src/app/core/**","server/utils/**","server/services/**","server/lib/**"],
  globalStylesheet: "src/styles.scss" || '',
  enginePrefix: "c-" || '',
  tokenKinds: { color: "--color-", fontSize: "--fs-", radius: "--radius-" },
  tokenFiles: ["src/styles.scss"],
}

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : [])
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const isTest = (p) => /\.(spec|test)\.[a-z]+$/i.test(p)
export const DRAFT_PREFIX = 'DRAFT — written by the kit\'s scan on '

/** The settings with the `--config` object laid over them. */
export function scanSettings(over = {}) {
  const r = over?.reuse ?? {}
  const q = over?.styleqa ?? {}
  return {
    ...SCAN_SETTINGS,
    ...r,
    registry: over?.paths?.reuseRegistry || SCAN_SETTINGS.registry,
    tokenKinds: { ...SCAN_SETTINGS.tokenKinds, ...(q.tokenPrefixes ?? {}) },
    tokenFiles: q.tokenFiles ?? SCAN_SETTINGS.tokenFiles,
  }
}

function repoFiles(root) {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) return []
  return [...new Set(r.stdout.split('\n').map((x) => x.trim().replace(/\\/g, '/')).filter(Boolean))].sort(byName)
}

const stemOf = (p) => p.split('/').pop().split('.')[0]
const slug = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
const title = (s) => s.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

/** { components: [{ id, title, selector, file }], engine: [class], tokens: { kind: [name] } } found in the project. */
export function scan(root, s = SCAN_SETTINGS) {
  const files = repoFiles(root)
  const isPiece = matcher([...list(s.componentFiles), ...list(s.logicFiles)])
  const isShared = matcher(list(s.sharedDirs))
  const used = new Map()
  const components = []
  for (const f of files.filter((p) => isShared(p) && isPiece(p) && !isTest(p))) {
    const base = slug(stemOf(f)) || 'piece'
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    let selector = ''
    try {
      selector = /selector:\s*['"`]([^'"`]+)['"`]/.exec(readFileSync(join(root, f), 'utf8'))?.[1] ?? ''
    } catch { /* unreadable: no selector */ }
    const id = n === 1 ? base : `${base}-${n}`
    components.push({ id, title: title(id), selector, file: f })
  }
  const engine = []
  if (s.enginePrefix && s.globalStylesheet && existsSync(join(root, s.globalStylesheet))) {
    const esc = s.enginePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(?<![\\w-])\\.(${esc}[\\w-]*)`, 'g')
    const names = new Set()
    for (const m of readFileSync(join(root, s.globalStylesheet), 'utf8').matchAll(re)) names.add(m[1])
    engine.push(...[...names].sort(byName))
  }
  const tokens = {}
  const kinds = Object.entries(s.tokenKinds ?? {}).filter(([, p]) => p)
  const isToken = matcher(list(s.tokenFiles))
  for (const f of files.filter((p) => isToken(p))) {
    for (const line of readFileSync(join(root, f), 'utf8').split(/\r?\n/)) {
      const m = /^\s*((?:--|\$|@)[\w-]+)\s*:/.exec(line)
      if (!m) continue
      for (const [k, p] of kinds) if (m[1].startsWith(p)) (tokens[k] ??= new Set()).add(m[1])
    }
  }
  return { components, engine, tokens: Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, [...v].sort(byName)])) }
}

const BARE = `# Component families — what to reuse before you build

The single list of this project's shared pieces ("families"): for each job, which piece to use, where it lives and when.

## Families
`

/** The registry text with the draft on top and one block per found component; `current` is the file's text or null. */
export function draftText(found, current, date) {
  const base = current ?? BARE
  const out = [`${DRAFT_PREFIX}${date}; review every family, then delete this line`, '', base.replace(/\s+$/, '').replace(/\r\n/g, '\n'), '']
  for (const c of found.components) {
    out.push(`### ${c.id} — ${c.title}`, '', `- selector: ${c.selector || '(fill in)'}`, '- when: (fill in)', `- files: \`${c.file}\``, '')
  }
  const extra = []
  if (found.engine.length) extra.push(`Engine classes found: ${found.engine.map((n) => `\`.${n}\``).join(' ')}`)
  for (const [k, v] of Object.entries(found.tokens)) extra.push(`Tokens found (${k}): ${v.map((n) => `\`${n}\``).join(' ')}`)
  if (extra.length) out.push('## Found by the scan (not families)', '', ...extra, '')
  return `${out.join('\n').replace(/\n+$/, '')}\n`
}

export async function main(argv = process.argv.slice(2), root = process.cwd(), print = (l) => console.log(l)) {
  const ci = argv.indexOf('--config')
  const bad = argv.filter((a, i) => a !== '--write' && a !== '--config' && !(ci >= 0 && i === ci + 1))
  if (bad.length || (ci >= 0 && !argv[ci + 1])) {
    print(`SCAN: refused — unknown argument ${bad[0] ?? '--config (needs a file)'}`)
    print('usage: node scripts/reuse-scan.mjs [--write] [--config <json file>]')
    return 2
  }
  const write = argv.includes('--write')
  try {
    const over = ci >= 0 ? JSON.parse(readFileSync(join(root, argv[ci + 1]), 'utf8')) : {}
    const s = scanSettings(over)
    const found = scan(root, s)
    const tokenCount = Object.values(found.tokens).reduce((n, v) => n + v.length, 0)
    print(`SCAN: found ${found.components.length} shared components, ${found.engine.length} engine classes, ${tokenCount} tokens`)
    for (const c of found.components) print(`SCAN: component ${c.id} — ${c.file}`)
    if (!write) return 0
    const wrote = []
    const regAbs = join(root, s.registry)
    const regText = existsSync(regAbs) ? readFileSync(regAbs, 'utf8') : null
    const hasFamilies = regText !== null && (parseRegistry(regText).families.length > 0 || regText.startsWith(DRAFT_PREFIX))
    if (found.components.length && !hasFamilies) {
      mkdirSync(dirname(regAbs), { recursive: true })
      writeFileSync(regAbs, draftText(found, regText, new Date().toISOString().slice(0, 10)))
      wrote.push(`${s.registry} (a DRAFT of ${found.components.length} families — review it)`)
    }
    const config = loadConfig(root, ci >= 0 ? argv[ci + 1] : null)
    const baseAbs = join(root, config.debtBaseline)
    const old = existsSync(baseAbs) ? readBaseline(root, config.debtBaseline) : null
    if (old === null || Object.keys(old.counts).length === 0) {
      const checks = await loadChecks()
      const counts = await collectCounts(checks, { root, base: null, plan: null, planText: null, items: null, config, note: () => {} })
      // An empty seed stays as it is when nothing is counted (a kind at zero is the same as no kind).
      const counted = Object.fromEntries(Object.entries(counts).filter(([, k]) => k.total > 0))
      if (old === null || Object.keys(counted).length) {
        writeBaseline(root, config.debtBaseline, counted)
        wrote.push(`${config.debtBaseline} (${Object.keys(counted).length} kinds, ${Object.values(counted).reduce((n, k) => n + k.total, 0)} counted)`)
      }
    }
    print(wrote.length ? `SCAN: wrote ${wrote.join(' and ')}` : 'SCAN: nothing written (the registry and the baseline are already there)')
    return 0
  } catch (e) {
    print(`SCAN: failed — ${e.message}`)
    return 1
  }
}

if (isEntry(import.meta.url)) process.exitCode = await main()
