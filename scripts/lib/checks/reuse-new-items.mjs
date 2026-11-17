// A new piece the plan did not declare: every component, shared util / pipe / service, component-stylesheet
// class, engine class and token the branch adds needs a `## Reuse Check` row that names it (file stem or selector).
// The message names the nearest registry family, existing class or shared piece. A rung 3 row needs an added line naming
// the piece under its family in the registry file, a rung 4 row a new family heading whose block names it. Without a plan (CI) the check is skipped with a note; the ratchet still runs.
// Settings: reuse.* (kit.config.json), a kit-checks `--config` JSON "reuse" object may lay over them (tests).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { matcher, selectorPart, classNames } from '../diff-items.mjs'
import { sectionRows } from '../plan-sections.mjs'
import { readRegistryFile, REGISTRY_PATH } from '../registry.mjs'
import { REUSE_COLUMNS, nameTokens, rowsName, nearest, escapeRe, pieceNames } from '../reuse-check.mjs'
import { projectFiles } from './reuse-copies.mjs'

export const id = 'reuse-new-items'

const SETTINGS = {
  componentFiles: ["src/app/**/*.component.ts"],
  logicFiles: ["src/app/**/*.pipe.ts","src/app/**/*.service.ts","src/app/core/utils/**/*.ts","server/utils/**/*.js","server/services/**/*.js","server/lib/**/*.js"],
  componentStylesheets: ["src/app/**/*.scss"],
  sharedDirs: ["src/app/shared/**","src/app/core/**","server/utils/**","server/services/**","server/lib/**"],
  globalStylesheet: "src/styles.scss" || '',
  enginePrefix: "c-" || '',
  tokenPrefixes: ["--color-", "--fs-", "--radius-"].filter(Boolean),
}

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : [])
const isTest = (p) => /\.(spec|test)\.[a-z]+$/i.test(p)
const stemOf = (p) => p.split('/').pop().split('.')[0]

function classesIn(text) {
  const out = new Set()
  for (const l of String(text).split(/\r?\n/)) {
    const sel = selectorPart(l)
    if (sel !== null) for (const n of classNames(sel)) out.add(n)
  }
  return out
}

/** The text of `file` at the merge base, or null when it did not exist there. */
function baseText(root, mergeBase, file) {
  const r = spawnSync('git', ['show', `${mergeBase}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true })
  return r.status === 0 ? r.stdout : null
}

export function run(ctx) {
  const s = { ...SETTINGS, ...(ctx.config?.reuse ?? {}) }
  const isComponent = matcher(list(s.componentFiles))
  const isLogic = matcher(list(s.logicFiles))
  const isComponentSheet = matcher(list(s.componentStylesheets))
  const isShared = matcher(list(s.sharedDirs))
  const anything = list(s.componentFiles).length || list(s.logicFiles).length || list(s.componentStylesheets).length || s.globalStylesheet
  if (!anything) return []
  if (ctx.planText == null) {
    ctx.note('reuse-new-items skipped — no --plan (the ratchet still runs)')
    return []
  }
  const section = sectionRows(ctx.planText, 'Reuse Check', REUSE_COLUMNS)
  const rows = section.rows
  const registry = readRegistryFile(ctx.root)
  const files = projectFiles(ctx.root)
  const sheets = files.filter((f) => isComponentSheet(f) || f === s.globalStylesheet)
  const known = { families: (registry?.families ?? []).map((f) => ({ label: `the ${f.id} family`, tokens: nameTokens(`${f.id} ${f.title}`) })), classes: null }
  const classCandidates = (exclude) => {
    known.classes ??= sheets.flatMap((f) => {
      try { return [...classesIn(readFileSync(join(ctx.root, f), 'utf8'))].map((n) => ({ label: `.${n}`, n, f })) } catch { return [] }
    })
    return known.classes.filter((c) => !(c.f === exclude.file && c.n === exclude.name)).map((c) => ({ label: c.label, tokens: nameTokens(c.n) }))
  }
  const pieces = files.filter((f) => isShared(f) && !isTest(f)).map((f) => ({ label: f, tokens: nameTokens(stemOf(f)) }))
  const hint = (name, candidates) => {
    const n = nearest(name, candidates)
    return n ? `use ${n}` : 'nothing similar found'
  }
  const findings = []
  const undeclared = (file, line, what, near) => findings.push({ rule: 'reuse-undeclared', file, line, hint: `declare ${what} in ## Reuse Check or ${near.startsWith('use') ? near : `(${near})`}` })

  for (const f of ctx.items.files) {
    if (f.status !== 'added' || isTest(f.path)) continue
    const kind = isComponent(f.path) ? 'component' : isLogic(f.path) ? 'shared util' : null
    if (!kind) continue
    const stem = stemOf(f.path)
    if (rowsName(rows, stem) || rowsName(rows, f.path.split('/').pop())) continue
    undeclared(f.path, 1, `the new ${kind} ${stem}`, hint(stem, [...known.families, ...pieces.filter((p) => p.label !== f.path)]))
  }

  const seen = new Set()
  const fileBase = new Map()
  const wasThere = (file, name) => {
    if (!fileBase.has(file)) {
      const t = baseText(ctx.root, ctx.items.mergeBase, file)
      fileBase.set(file, t === null ? null : classesIn(t))
    }
    return fileBase.get(file)?.has(name) ?? false
  }
  for (const sel of ctx.items.selectors) {
    const engine = s.enginePrefix && sel.file === s.globalStylesheet && sel.name.startsWith(s.enginePrefix)
    if (!engine && !(isComponentSheet(sel.file) && sel.file !== s.globalStylesheet)) continue
    const key = `${sel.file}|${sel.name}`
    if (seen.has(key)) continue
    seen.add(key)
    if (wasThere(sel.file, sel.name) || rowsName(rows, sel.name)) continue
    undeclared(sel.file, sel.line, `the new ${engine ? 'engine class' : 'class'} .${sel.name}`, hint(sel.name, [...known.families, ...classCandidates(sel)]))
  }

  if (s.globalStylesheet) {
    const prefixes = list(s.tokenPrefixes)
    for (const t of ctx.items.tokens) {
      if (t.file !== s.globalStylesheet || (prefixes.length && !prefixes.some((p) => t.name.startsWith(p)))) continue
      if (rowsName(rows, t.name) || wasTokenThere(ctx, t)) continue
      undeclared(t.file, t.line, `the new token ${t.name}`, hint(t.name, known.families))
    }
  }

  const registryPath = REGISTRY_PATH
  const rung34 = rows.filter((r) => !r.none && /^[34]$/.test(r.rung))
  if (rung34.length && registry) {
    const added = ctx.items.lines.filter((l) => l.file === registryPath)
    const addedStems = ctx.items.files.filter((f) => f.status === 'added').map((f) => stemOf(f.path))
    const addedSelectors = ctx.items.selectors.map((x) => x.name)
    for (const r of rung34) {
      const names = [String(r.piece).replace(/`/g, '').trim(), ...addedStems.filter((n) => rowsName([r], n)), ...addedSelectors.filter((n) => rowsName([r], n))].filter(Boolean)
      const naming = (ls) => ls.some((l) => names.some((n) => pieceNames(l.text, n)))
      const inRange = (fam) => added.filter((l) => l.line >= fam.line && l.line <= fam.end)
      if (r.rung === '3') {
        const fam = registry.families.find((f) => f.id === String(r.family).replace(/[`\s]/g, '').toLowerCase())
        if (!fam || !naming(inRange(fam))) {
          findings.push({ rule: 'reuse-registry-missing-piece', file: registryPath, line: 1, hint: `the ${r.piece} row (rung 3) needs a line under ### ${r.family} that names it` })
        }
      } else {
        const heads = registry.families.filter((f) => added.some((l) => l.line === f.line))
        if (!heads.some((f) => naming(inRange(f)))) {
          findings.push({ rule: 'reuse-registry-missing-piece', file: registryPath, line: 1, hint: `the ${r.piece} row (rung 4) needs a new family heading in ${registryPath} that names it` })
        }
      }
    }
  }
  return findings
}

function wasTokenThere(ctx, t) {
  const text = baseText(ctx.root, ctx.items.mergeBase, t.file)
  return text !== null && new RegExp(`^\\s*${escapeRe(t.name)}\\s*:`, 'm').test(text)
}
